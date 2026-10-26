"""Pure reducer from stored events to UI state (unit-tested without NiceGUI)."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime

from app.core.utils import domain_of, normalize_url
from app.models.events import Event
from app.models.report import FinalReport, RunStats
from app.ui.agents import (
    AGENTS,
    EDGES,
    HANDOFF_LABELS,
    PHASES,
    PHASE_BY_ID,
    PHASE_INDEX,
    PHASE_OF_AGENT,
)

MAX_EVENTS = 500
THOUGHT_CHARS = 90
ACTIVE_TICKS = 5
TERMINAL = {"done", "skipped", "failed"}


@dataclass
class Worker:
    key: str
    url: str = ""
    domain: str = ""
    title: str = ""
    state: str = "queued"
    message: str = ""
    reason: str = ""
    flash_until: int = 0


@dataclass
class Handoff:
    src: str
    dst: str
    label: str
    at_event_id: int = 0


@dataclass
class RunView:
    run_id: str
    status: str = "queued"
    last_event_id: int = 0
    agent_status: dict[str, str] = field(default_factory=lambda: {agent["id"]: "idle" for agent in AGENTS})
    started_agents: set[str] = field(default_factory=set)
    verifiers_started: int = 0
    verifiers_done: int = 0
    events: list[Event] = field(default_factory=list)
    candidates: list[dict] = field(default_factory=list)
    live_view_url: str | None = None
    interrupt: dict | None = None
    stats: RunStats = field(default_factory=RunStats)
    graph_version: int = 0
    finished: bool = False
    report: FinalReport | None = None
    student_name: str | None = None
    started_at: datetime | None = None

    # v2 mission-control state
    phase: str | None = None
    phase_done: set[str] = field(default_factory=set)
    thoughts: dict[str, str] = field(default_factory=dict)
    workers: dict[str, Worker] = field(default_factory=dict)
    handoffs: list[Handoff] = field(default_factory=list)
    active_edges: set[tuple[str, str]] = field(default_factory=set)
    edge_until: dict[tuple[str, str], int] = field(default_factory=dict)
    profile_snapshot: dict | None = None
    tick: int = 0

    # bookkeeping for hand-off labels
    last_finished_agent: str | None = None
    last_finished_data: dict = field(default_factory=dict)
    last_finished_event_id: int = 0
    recent_finished: list[tuple[str, dict, int]] = field(default_factory=list)


def _trim(message: str) -> str:
    return " ".join(str(message or "").split())[:THOUGHT_CHARS]


def _set_thought(view: RunView, agent: str, message: str, worker: str | None = None) -> None:
    if not agent:
        return
    view.thoughts[agent] = _trim(message)
    if worker and worker in view.workers:
        view.workers[worker].message = _trim(message)


def _worker(view: RunView, event: Event, create: bool = True) -> Worker | None:
    key = str(event.data.get("worker") or "")
    if not key:
        return None
    worker = view.workers.get(key)
    if worker is None and create:
        url = str(event.data.get("url") or "")
        worker = Worker(
            key=key,
            url=url,
            domain=str(event.data.get("domain") or domain_of(url) or key),
            title=str(event.data.get("title") or ""),
        )
        view.workers[key] = worker
    if worker is not None:
        if event.data.get("title") and not worker.title:
            worker.title = str(event.data["title"])
        if event.data.get("domain") and not worker.domain:
            worker.domain = str(event.data["domain"])
        if event.data.get("url") and not worker.url:
            worker.url = str(event.data["url"])
    return worker


def _handoff_label(agent: str, data: dict, destination: str) -> str:
    counts = data.get("counts") or {}
    for key, template in HANDOFF_LABELS.items():
        if key in counts:
            return template.format(n=counts[key])
    updated = data.get("updated") or []
    if "profile" in updated:
        return "profile"
    if "github" in updated:
        return "GitHub insights"
    if agent == "supervisor":
        return "re-planning" if destination == "planner" else "ready"
    return ""


def _refresh_edges(view: RunView) -> None:
    active = {
        (source, target)
        for source, target, _loop in EDGES
        if view.agent_status.get(target) == "running"
    }
    expired = [edge for edge, until in view.edge_until.items() if until < view.tick]
    for edge in expired:
        view.edge_until.pop(edge, None)
    active |= set(view.edge_until)
    view.active_edges = active


def _update_phases(view: RunView) -> None:
    if view.finished:
        view.phase = PHASES[-1]["id"]
        view.phase_done = {phase["id"] for phase in PHASES}
        return

    started_phases = [
        index
        for index, phase in enumerate(PHASES)
        if any(agent in view.started_agents for agent in phase["agents"])
    ]
    if not started_phases:
        view.phase = None
        view.phase_done = set()
        return

    running = [
        PHASE_INDEX[PHASE_OF_AGENT[agent]]
        for agent, status in view.agent_status.items()
        if status == "running" and agent in PHASE_OF_AGENT
    ]
    waiting = [
        PHASE_INDEX[PHASE_OF_AGENT[agent]]
        for agent, status in view.agent_status.items()
        if status == "waiting" and agent in PHASE_OF_AGENT
    ]
    current = waiting[-1] if waiting else max(running) if running else started_phases[-1]
    view.phase = PHASES[current]["id"]

    done: set[str] = set()
    for index, phase in enumerate(PHASES):
        agents = [agent for agent in phase["agents"] if agent in view.started_agents]
        if not agents:
            continue
        terminal = all(view.agent_status.get(agent) in TERMINAL for agent in agents)
        later_started = any(
            any(agent in view.started_agents for agent in later["agents"])
            for later in PHASES[index + 1 :]
        )
        if terminal and later_started:
            done.add(phase["id"])
    view.phase_done = done


def reduce_event(view: RunView, event: Event) -> set[str]:
    """Apply one event; return the components that need refreshing."""
    view.tick += 1
    view.last_event_id = max(view.last_event_id, event.id or 0)
    view.events.append(event)
    if len(view.events) > MAX_EVENTS:
        del view.events[: len(view.events) - MAX_EVENTS]
    view.started_at = view.started_at or event.ts

    dirty = {"activity"}
    kind = event.type
    agent = event.agent or ""

    if kind == "run_started":
        view.status = "running"
        view.phase = view.phase or "understand"
        dirty |= {"canvas", "phase", "summary", "flow", "stats"}
    elif kind == "agent_started":
        view.agent_status[agent] = "running"
        view.started_agents.add(agent)
        view.stats.agents_run += 1
        if agent == "verifier":
            view.verifiers_started += 1
            worker = _worker(view, event)
            if worker is not None:
                worker.state = "fetching"
                worker.message = "Starting"
        for source, data, source_event_id in reversed(view.recent_finished):
            if any(a == source and b == agent for a, b, _ in EDGES):
                label = _handoff_label(source, data, agent)
                view.handoffs.append(Handoff(source, agent, label, source_event_id))
                view.edge_until[(source, agent)] = view.tick + ACTIVE_TICKS
                view.recent_finished.remove((source, data, source_event_id))
                break
        dirty |= {"canvas", "phase", "summary", "flow", "stats"}
    elif kind == "agent_finished":
        view.agent_status[agent] = "done"
        if event.data.get("student_name"):
            view.student_name = str(event.data["student_name"])
        preview = event.data.get("profile_preview")
        if isinstance(preview, dict) and preview:
            view.profile_snapshot = {**(view.profile_snapshot or {}), **preview}
        if agent == "verifier":
            view.verifiers_done += 1
        view.last_finished_agent = agent
        view.last_finished_data = dict(event.data)
        view.last_finished_event_id = event.id or 0
        view.recent_finished.append((agent, dict(event.data), event.id or 0))
        if len(view.recent_finished) > 8:
            view.recent_finished.pop(0)
        dirty |= {"canvas", "phase", "profile", "summary", "flow", "header", "results"}
    elif kind == "agent_failed":
        view.agent_status[agent] = "failed"
        view.stats.errors += 1
        if agent == "verifier":
            worker = _worker(view, event, create=False)
            if worker is not None:
                worker.state = "failed"
                worker.message = _trim(event.message)
            else:
                for item in view.workers.values():
                    if item.state in {"fetching", "reading"}:
                        item.state = "failed"
                        item.message = "Verifier failed"
        dirty |= {"canvas", "phase", "summary", "sources", "flow", "stats"}
    elif kind == "agent_skipped":
        view.agent_status[agent] = "skipped"
        dirty |= {"canvas", "phase", "flow"}
    elif kind == "tool_call":
        view.stats.tool_calls += 1
        label = str(event.data.get("label") or "")
        if label == "llm":
            view.stats.llm_calls += 1
        _set_thought(view, agent, event.message, event.data.get("worker"))
        worker = _worker(view, event, create=False)
        if worker is not None:
            if label.startswith("fetch"):
                worker.state = "fetching"
                worker.message = f"Fetching via {event.data.get('provider') or 'provider'}"
            elif label == "llm":
                worker.state = "reading"
                worker.message = "Reading the page"
        dirty |= {"canvas", "sources", "summary", "stats", "feed"}
    elif kind == "tool_result":
        worker = _worker(view, event, create=False)
        if worker is not None and str(event.data.get("label") or "").startswith("fetch"):
            worker.state = "reading"
            worker.message = "Reading the page"
        dirty |= {"canvas", "sources", "summary", "stats", "feed"}
    elif kind == "log":
        pages = event.data.get("pages_read")
        if isinstance(pages, int):
            view.stats.pages_read += pages
            dirty |= {"stats"}
        _set_thought(view, agent, event.message, event.data.get("worker"))
        dirty |= {"canvas", "sources"}
    elif kind == "retry":
        view.stats.retries += 1
        dirty |= {"canvas", "summary", "stats"}
    elif kind == "fallback":
        view.stats.fallbacks += 1
        worker = _worker(view, event, create=False)
        if worker is not None:
            worker.flash_until = view.tick + 2
            worker.message = _trim(event.message)
        _set_thought(view, agent, event.message, event.data.get("worker"))
        dirty |= {"canvas", "sources", "summary", "stats"}
    elif kind == "chaos_injected":
        dirty |= {"canvas"}
    elif kind == "tool_error":
        view.stats.errors += 1
        worker = _worker(view, event, create=False)
        if worker is not None:
            worker.state = "failed"
            worker.message = _trim(event.message)
        dirty |= {"canvas", "sources", "summary", "stats"}
    elif kind == "decision":
        _set_thought(view, agent, event.message, event.data.get("worker"))
        dirty |= {"canvas", "activity"}
    elif kind == "run_finished":
        view.finished = True
        view.status = "finished"
        view.live_view_url = None
        if view.started_at:
            view.stats.duration_sec = round((event.ts - view.started_at).total_seconds(), 1)
        dirty |= {
            "canvas",
            "phase",
            "summary",
            "results",
            "browser",
            "flow",
            "stats",
            "feed",
        }
    elif kind == "run_failed":
        view.finished = True
        view.status = "failed"
        view.live_view_url = None
        view.stats.errors += 1
        dirty |= {
            "canvas",
            "phase",
            "summary",
            "results",
            "browser",
            "flow",
            "stats",
            "feed",
        }
    elif kind == "interrupt":
        view.interrupt = event.data
        view.status = "waiting_input"
        view.agent_status["clarifier"] = "waiting"
        view.started_agents.add("clarifier")
        dirty |= {"input", "canvas", "phase", "dialog", "flow"}
    elif kind == "resumed":
        view.interrupt = None
        view.status = "running"
        view.agent_status["clarifier"] = "running"
        dirty |= {"input", "canvas", "phase", "dialog", "flow"}
    elif kind == "browser_live_view":
        view.live_view_url = event.data.get("url")
        dirty |= {"browser"}
    elif kind == "graph_update":
        view.graph_version += 1
        dirty |= {"graph"}
    elif kind == "candidate_found":
        url = str(event.data.get("url") or "")
        title = str(event.data.get("title") or event.message)
        view.candidates.append(
            {
                "title": title,
                "url": url,
                "provider": event.data.get("provider", ""),
                "official": bool(event.data.get("official")),
            }
        )
        key = normalize_url(url) or url
        if key:
            view.workers.setdefault(
                key,
                Worker(
                    key=key,
                    url=url,
                    domain=domain_of(url) or key,
                    title=title,
                    state="queued",
                    message="Queued",
                ),
            )
        dirty |= {"sources", "canvas", "candidates"}
    elif kind == "opportunity_verified":
        worker = _worker(view, event, create=False)
        if worker is not None:
            worker.state = "verified"
            worker.message = _trim(event.data.get("name") or event.message)
            worker.flash_until = 0
        dirty |= {"sources", "canvas", "candidates"}
    elif kind == "opportunity_rejected":
        worker = _worker(view, event, create=False)
        if worker is not None:
            worker.state = "rejected"
            worker.reason = str(event.data.get("reason") or event.message)
            worker.message = _trim(worker.reason)
        dirty |= {"sources", "canvas", "candidates"}

    _update_phases(view)
    _refresh_edges(view)
    return dirty


def worker_summary(view: RunView) -> dict[str, int]:
    counts = {"queued": 0, "fetching": 0, "reading": 0, "verified": 0, "rejected": 0, "failed": 0}
    for worker in view.workers.values():
        counts[worker.state] = counts.get(worker.state, 0) + 1
    return counts


def phase_label(phase_id: str | None) -> str:
    if not phase_id:
        return "Starting"
    return PHASE_BY_ID.get(phase_id, {}).get("label", phase_id.title())
