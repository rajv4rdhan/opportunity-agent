"""Pure reducer from stored events to UI state (unit-tested without NiceGUI)."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime

from app.models.events import Event
from app.models.report import FinalReport, RunStats
from app.ui.agents import AGENTS

MAX_EVENTS = 500


@dataclass
class RunView:
    run_id: str
    status: str = "queued"
    last_event_id: int = 0
    agent_status: dict[str, str] = field(default_factory=lambda: {agent["id"]: "idle" for agent in AGENTS})
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
    started_at: datetime | None = None


def reduce_event(view: RunView, event: Event) -> set[str]:
    """Apply one event; return the components that need refreshing."""
    view.last_event_id = max(view.last_event_id, event.id or 0)
    view.events.append(event)
    if len(view.events) > MAX_EVENTS:
        del view.events[: len(view.events) - MAX_EVENTS]

    dirty = {"feed"}
    kind = event.type
    agent = event.agent or ""

    if kind == "run_started":
        view.status = "running"
        view.started_at = view.started_at or event.ts
        dirty |= {"flow", "stats"}
    elif kind == "agent_started":
        view.agent_status[agent] = "running"
        view.stats.agents_run += 1
        if agent == "verifier":
            view.verifiers_started += 1
        dirty |= {"flow", "stats"}
    elif kind == "agent_finished":
        view.agent_status[agent] = "done"
        if agent == "verifier":
            view.verifiers_done += 1
        dirty |= {"flow"}
    elif kind == "agent_failed":
        view.agent_status[agent] = "failed"
        view.stats.errors += 1
        dirty |= {"flow", "stats"}
    elif kind == "agent_skipped":
        view.agent_status[agent] = "skipped"
        dirty |= {"flow"}
    elif kind == "tool_call":
        view.stats.tool_calls += 1
        if event.data.get("label") == "llm":
            view.stats.llm_calls += 1
        dirty |= {"stats"}
    elif kind == "tool_result":
        dirty |= {"stats"}
    elif kind == "log":
        pages = event.data.get("pages_read")
        if isinstance(pages, int):
            view.stats.pages_read += pages
            dirty |= {"stats"}
    elif kind == "retry":
        view.stats.retries += 1
        dirty |= {"stats"}
    elif kind == "fallback":
        view.stats.fallbacks += 1
        dirty |= {"stats"}
    elif kind in {"tool_error", "run_failed"}:
        view.stats.errors += 1
        dirty |= {"stats"}
    elif kind == "run_finished":
        view.finished = True
        view.status = "finished"
        if view.started_at:
            view.stats.duration_sec = round((event.ts - view.started_at).total_seconds(), 1)
        dirty |= {"flow", "stats", "results"}
    elif kind == "run_failed":
        view.finished = True
        view.status = "failed"
        dirty |= {"flow", "stats", "results"}
    elif kind == "interrupt":
        view.interrupt = event.data
        view.status = "waiting_input"
        dirty |= {"dialog", "flow"}
    elif kind == "resumed":
        view.interrupt = None
        view.status = "running"
        dirty |= {"dialog", "flow"}
    elif kind == "browser_live_view":
        view.live_view_url = event.data.get("url")
        dirty |= {"browser"}
    elif kind == "graph_update":
        view.graph_version += 1
        dirty |= {"graph"}
    elif kind == "candidate_found":
        view.candidates.append(
            {
                "title": event.data.get("title", event.message),
                "url": event.data.get("url", ""),
                "provider": event.data.get("provider", ""),
                "official": bool(event.data.get("official")),
            }
        )
        dirty |= {"candidates"}
    return dirty
