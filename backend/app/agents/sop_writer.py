"""SOP Writer: draft for the top match, revised after the Critic's notes."""

from __future__ import annotations

from app.core.agent import AgentCtx, agent


def _target(state: dict):
    top5 = state.get("top5", [])
    if top5:
        return top5[0].opportunity
    return next(
        (opportunity for opportunity in state.get("opportunities", []) if opportunity.eligibility != "not_eligible"),
        None,
    )


@agent("sop_writer")
async def sop_writer(state: dict, ctx: AgentCtx) -> dict:
    target = _target(state)
    if target is None:
        await ctx.log("No eligible opportunity to write an SOP for")
        return {}

    notes = "\n".join(f"- {note}" for note in state.get("critic_notes", [])) or "none"
    text = await ctx.llm(
        "sop_write",
        None,
        tier="smart",
        profile=state["profile"],
        github=state.get("github"),
        opportunity=target,
        critic_notes=notes,
        temperature=0.7,
    )
    revision = state.get("sop_revisions", 0) + 1
    await ctx.log(f"SOP draft {revision} for {target.name} ({len(text.split())} words)")
    return {"sop_markdown": text, "sop_for": target.name, "sop_revisions": revision}
