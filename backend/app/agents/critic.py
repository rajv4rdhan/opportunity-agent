"""Critic: fact-check the SOP against the profile and the opportunity."""

from __future__ import annotations

from app.core.agent import AgentCtx, agent
from app.models.agent_outputs import CriticOutput


def _target(state: dict):
    top5 = state.get("top5", [])
    return top5[0].opportunity if top5 else None


@agent("critic")
async def critic(state: dict, ctx: AgentCtx) -> dict:
    sop = state.get("sop_markdown")
    target = _target(state)
    if not sop or target is None:
        return {"critic_passed": True, "critic_notes": []}

    result = await ctx.llm(
        "critic",
        CriticOutput,
        tier="smart",
        sop=sop,
        profile=state["profile"],
        github=state.get("github"),
        opportunity=target,
    )
    verdict = "passed" if result.passed else f"needs revision ({len(result.issues)} issue(s))"
    await ctx.decide(f"Critic {verdict}")
    return {"critic_passed": result.passed, "critic_notes": result.issues}
