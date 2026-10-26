"""Agent decorator: lifecycle payloads, worker identity and interrupts."""

from __future__ import annotations

import pytest
from langgraph.errors import GraphInterrupt

import app.core.agent as agent_module
from app.core.agent import AgentCtx, agent
from app.models.profile import Project, StudentProfile


@pytest.fixture
def captured(monkeypatch):
    events = []

    async def fake_emit(run_id, type, message, agent=None, **data):
        events.append({"run_id": run_id, "type": type, "message": message, "agent": agent, "data": data})

    monkeypatch.setattr(agent_module, "emit_event", fake_emit)
    return events


async def test_worker_identity_counts_and_profile_preview_are_emitted(captured):
    @agent("verifier")
    async def fake_verifier(state, ctx):
        await ctx.log("Fetching the page")
        return {
            "opportunities": ["one"],
            "profile": StudentProfile(
                name="Rahul",
                skills=["python", "pytorch"],
                projects=[Project(name="Swarm UI", source="github")],
            ),
        }

    state = {
        "run_id": "run1",
        "chaos": {},
        "candidate": {"url": "https://www.daad.de/page", "title": "DAAD"},
    }
    result = await fake_verifier(state)

    assert result["opportunities"] == ["one"]
    started = captured[0]
    assert started["type"] == "agent_started"
    assert started["data"]["worker"] == "https://daad.de/page"
    assert started["data"]["domain"] == "daad.de"
    assert started["data"]["title"] == "DAAD"

    log = captured[1]
    assert log["type"] == "log"
    assert log["data"]["worker"] == "https://daad.de/page"

    finished = captured[-1]
    assert finished["type"] == "agent_finished"
    assert finished["data"]["counts"] == {"opportunities": 1}
    assert finished["data"]["worker"] == "https://daad.de/page"
    preview = finished["data"]["profile_preview"]
    assert preview["name"] == "Rahul"
    assert preview["projects"][0]["source"] == "github"
    assert finished["data"]["student_name"] == "Rahul"


async def test_graph_interrupt_is_re_raised_without_a_failure_event(captured):
    @agent("clarifier")
    async def interrupted(state, ctx):
        raise GraphInterrupt(())

    with pytest.raises(GraphInterrupt):
        await interrupted({"run_id": "run1", "chaos": {}})

    assert [event["type"] for event in captured] == ["agent_started"]


async def test_ctx_emit_adds_the_worker_once(captured):
    ctx = AgentCtx(run_id="run1", agent="verifier", worker="https://x.edu")
    await ctx.emit("opportunity_verified", "Verified", worker="https://x.edu")
    await ctx.emit("log", "Reading")

    assert captured[0]["data"]["worker"] == "https://x.edu"
    assert captured[1]["data"]["worker"] == "https://x.edu"
