from datetime import datetime, timedelta, timezone

from app.models.events import Event
from app.ui.live_state import RunView, reduce_event

BASE = datetime(2026, 10, 24, 12, 0, tzinfo=timezone.utc)


def event(index: int, kind: str, agent: str | None = None, data: dict | None = None, message: str | None = None, **fields) -> Event:
    return Event(
        id=index,
        run_id="run1",
        ts=BASE + timedelta(seconds=index),
        type=kind,
        agent=agent,
        message=message or kind,
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


def test_profile_name_reaches_the_header():
    view = RunView("run1")
    reduce_event(view, event(1, "agent_finished", "profile_analyst", student_name="Test Student"))
    assert view.student_name == "Test Student"


def test_interrupt_and_resume():
    view = RunView("run1")
    payload = {"questions": [{"field": "nationality", "question": "Nationality?", "type": "text"}]}
    reduce_event(view, event(1, "interrupt", data=payload))
    assert view.interrupt == payload
    assert view.status == "waiting_input"
    reduce_event(view, event(2, "resumed"))
    assert view.interrupt is None
    assert view.status == "running"


def test_run_finished_sets_duration_and_clears_browser():
    view = RunView("run1")
    reduce_event(view, event(1, "run_started"))
    reduce_event(view, event(2, "browser_live_view", url="https://live.example"))
    assert view.live_view_url == "https://live.example"
    reduce_event(view, event(9, "run_finished"))
    assert view.finished is True
    assert view.status == "finished"
    assert view.stats.duration_sec == 8.0
    assert view.live_view_url is None


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


def test_run_failed_sets_finished_and_clears_browser():
    view = RunView("run1")
    reduce_event(view, event(1, "run_started"))
    reduce_event(view, event(2, "browser_live_view", url="https://live.example"))
    reduce_event(view, event(3, "run_failed"))

    assert view.finished is True
    assert view.status == "failed"
    assert view.stats.errors == 1
    assert view.live_view_url is None


def test_verifier_workers_move_through_the_pool():
    view = RunView("run1")
    reduce_event(
        view,
        event(1, "candidate_found", "scout", title="DAAD", url="https://www.daad.de/x"),
    )
    assert view.workers["https://daad.de/x"].state == "queued"

    reduce_event(
        view,
        event(
            2,
            "agent_started",
            "verifier",
            worker="https://daad.de/x",
            title="DAAD",
            domain="daad.de",
        ),
    )
    assert view.workers["https://daad.de/x"].state == "fetching"

    reduce_event(
        view,
        event(3, "tool_call", "verifier", worker="https://daad.de/x", label="fetch", provider="jina"),
    )
    assert view.workers["https://daad.de/x"].state == "fetching"

    reduce_event(
        view,
        event(4, "tool_result", "verifier", worker="https://daad.de/x", label="fetch"),
    )
    assert view.workers["https://daad.de/x"].state == "reading"

    reduce_event(
        view,
        event(5, "fallback", "verifier", worker="https://daad.de/x", label="fetch"),
    )
    assert view.workers["https://daad.de/x"].state == "reading"
    assert view.workers["https://daad.de/x"].flash_until == view.tick + 2

    reduce_event(
        view,
        event(
            6,
            "opportunity_verified",
            "verifier",
            worker="https://daad.de/x",
            name="DAAD EPOS",
        ),
    )
    worker = view.workers["https://daad.de/x"]
    assert worker.state == "verified"
    assert worker.message == "DAAD EPOS"


def test_rejected_worker_keeps_the_reason():
    view = RunView("run1")
    reduce_event(view, event(1, "candidate_found", "scout", url="https://x.edu"))
    reduce_event(
        view,
        event(
            2,
            "opportunity_rejected",
            "verifier",
            worker="https://x.edu",
            reason="IELTS 7.5 required",
        ),
    )
    worker = view.workers["https://x.edu"]
    assert worker.state == "rejected"
    assert "IELTS" in worker.reason


def test_handoff_uses_counts_and_expires_after_a_few_ticks():
    view = RunView("run1")
    reduce_event(view, event(1, "run_started"))
    reduce_event(
        view,
        event(
            2,
            "agent_finished",
            "scout",
            counts={"candidates": 7, "pending_verify": 7},
            updated=["candidates", "pending_verify"],
        ),
    )
    reduce_event(view, event(3, "agent_started", "verifier"))

    handoff = view.handoffs[-1]
    assert (handoff.src, handoff.dst, handoff.label) == ("scout", "verifier", "7 candidates")
    assert ("scout", "verifier") in view.active_edges

    reduce_event(view, event(4, "agent_finished", "verifier"))
    for index in range(5, 11):
        reduce_event(view, event(index, "tool_result", "verifier"))
    assert ("scout", "verifier") not in view.active_edges


def test_phases_advance_only_after_a_later_phase_starts():
    view = RunView("run1")
    reduce_event(view, event(1, "agent_started", "profile_analyst"))
    assert view.phase == "understand"
    reduce_event(view, event(2, "agent_finished", "profile_analyst"))
    assert "understand" not in view.phase_done

    reduce_event(view, event(3, "agent_started", "planner"))
    assert view.phase == "plan"
    assert "understand" in view.phase_done

    reduce_event(view, event(4, "run_finished"))
    assert view.phase == "write"
    assert view.phase_done == {"understand", "plan", "research", "verify", "decide", "write"}


def test_thoughts_are_trimmed_and_profile_snapshot_is_stored():
    view = RunView("run1")
    long_message = "x" * 200
    reduce_event(view, event(1, "log", "planner", message=long_message))
    assert len(view.thoughts["planner"]) == 90

    preview = {"name": "Rahul", "skills": ["python"]}
    reduce_event(view, event(2, "agent_finished", "profile_analyst", profile_preview=preview))
    assert view.profile_snapshot == preview


def test_same_events_produce_the_same_final_view():
    events = [
        event(1, "run_started"),
        event(2, "agent_started", "scout"),
        event(3, "candidate_found", "scout", url="https://a.edu", title="A"),
        event(4, "agent_finished", "scout", counts={"candidates": 1}),
        event(5, "agent_started", "verifier", worker="https://a.edu"),
        event(6, "opportunity_verified", "verifier", worker="https://a.edu", name="A"),
        event(7, "run_finished"),
    ]
    first = RunView("run1")
    second = RunView("run1")
    for item in events:
        reduce_event(first, item)
    for item in events:
        reduce_event(second, item)

    assert first.phase == second.phase
    assert first.phase_done == second.phase_done
    assert first.handoffs == second.handoffs
    assert first.active_edges == second.active_edges
    assert {key: worker.state for key, worker in first.workers.items()} == {
        key: worker.state for key, worker in second.workers.items()
    }

