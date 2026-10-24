"""Matcher: deterministic eligibility + scoring, then write to the knowledge graph."""

from __future__ import annotations

from app.core.agent import AgentCtx, agent
from app.core.events import emit
from app.services.matching import compute_gaps, evaluate_opportunity
from app.tools.graph_store import get_graph_store


@agent("matcher")
async def matcher(state: dict, ctx: AgentCtx) -> dict:
    profile = state["profile"]
    github = state.get("github")
    graph = await get_graph_store(ctx)
    await graph.upsert_student(ctx.run_id, profile, github)

    updated = []
    for opportunity in state.get("opportunities", []):
        evaluated = evaluate_opportunity(opportunity, profile, github)
        await graph.upsert_opportunity(evaluated)
        await graph.link_eligibility(ctx.run_id, evaluated)
        updated.append(evaluated)

    gaps = compute_gaps(updated)
    await emit(
        ctx.run_id,
        "graph_update",
        f"Knowledge graph updated: {len(updated)} opportunity/opportunities, {len(gaps)} gap(s)",
        ctx.agent,
        opportunities=len(updated),
        gaps=len(gaps),
    )
    return {"opportunities": updated, "gaps": gaps}
