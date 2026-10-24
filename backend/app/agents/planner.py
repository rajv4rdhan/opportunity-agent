"""Planner: profile → targeted search plan, re-planning with supervisor feedback."""

from __future__ import annotations

from datetime import date

from app.core.agent import AgentCtx, agent
from app.models.agent_outputs import PlannerOutput
from app.tools.graph_store import get_graph_store


@agent("planner")
async def planner(state: dict, ctx: AgentCtx) -> dict:
    profile = state["profile"]
    github = state.get("github")
    round_number = state.get("scout_round", 0) + 1
    covered = [task.query for task in state.get("plan", [])]

    reused = []
    try:
        graph = await get_graph_store(ctx)
        reused = await graph.recent_opportunities(profile.target_countries)
    except Exception as error:  # noqa: BLE001 - knowledge reuse is optional
        await ctx.log(f"Could not reuse graph opportunities: {error}")
    if reused:
        await ctx.log(f"Reused {len(reused)} verified opportunity/opportunities from the knowledge graph")

    output = await ctx.llm(
        "planner",
        PlannerOutput,
        tier="smart",
        profile=profile,
        github=github,
        feedback=state.get("planner_feedback") or "none",
        covered=covered,
        scout_round=round_number,
        today=date.today().isoformat(),
        year=date.today().year + 1,
    )
    if not output.tasks:
        await ctx.log("Planner returned no tasks; Scout will have nothing to search")
    await ctx.decide(output.strategy_note or f"Research round {round_number}: {len(output.tasks)} queries")
    return {
        "plan": output.tasks,
        "scout_round": round_number,
        "opportunities": reused,
    }
