from datetime import datetime, timedelta, timezone

from app.models.events import Event
from app.ui.live_state import RunView, reduce_event

BASE = datetime(2026, 10, 24, 12, 0, tzinfo=timezone.utc)


def event(index: int, kind: str, agent: str | None = None, data: dict | None = None, **fields) -> Event:
    return Event(
        id=index,
        run_id="run1",
        ts=BASE + timedelta(seconds=index),
        type=kind,
        agent=agent,
        message=kind,
        data={**(data or {}), **fields},
    )


def test_agent_status_and_verifier_counters():
    view = RunView("run1")
    reduce_event(view, event(1, "agent_started", "verifier"))
    assert view.agent_status["verifier"] == "running"
    assert view.verifiers_started == 1

    reduce_event(view, event(2, "agent_finished", "verifier"))
    assert view.agent_status["verifier"] == "done"
    assert view.verifiers_done == 1
    assert view.stats.agents_run == 1


def test_interrupt_and_resume():
    view = RunView("run1")
    payload = {"questions": [{"field": "nationality", "question": "Nationality?", "type": "text"}]}
    reduce_event(view, event(1, "interrupt", data=payload))
    assert view.interrupt == payload
    assert view.status == "waiting_input"
    reduce_event(view, event(2, "resumed"))
    assert view.interrupt is None
    assert view.status == "running"


def test_run_finished_sets_duration():
    view = RunView("run1")
    reduce_event(view, event(1, "run_started"))
    reduce_event(view, event(9, "run_finished"))
    assert view.finished is True
    assert view.status == "finished"
    assert view.stats.duration_sec == 8.0


def test_candidates_browser_and_graph():
    view = RunView("run1")
    reduce_event(view, event(1, "candidate_found", title="X", url="https://x.edu", provider="exa"))
    reduce_event(view, event(2, "browser_live_view", url="https://live.example"))
    reduce_event(view, event(3, "graph_update", opportunities=3))
    assert view.candidates[0]["url"] == "https://x.edu"
    assert view.live_view_url == "https://live.example"
    assert view.graph_version == 1


def test_failure_counts():
    view = RunView("run1")
    reduce_event(view, event(1, "agent_failed", "scout"))
    view.agent_status["scout"] = "failed"
    reduce_event(view, event(2, "fallback"))
    reduce_event(view, event(3, "retry"))
    assert view.stats.errors == 1
    assert view.stats.fallbacks == 1
    assert view.stats.retries == 1
