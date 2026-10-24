"""Ranker: top 5 with graph-grounded explanations."""

from __future__ import annotations

from app.core.agent import AgentCtx, agent
from app.models.agent_outputs import WhyFit
from app.models.report import TopMatch
from app.tools.graph_store import get_graph_store

ELIGIBLE = {"eligible", "partial", "unknown"}


@agent("ranker")
async def ranker(state: dict, ctx: AgentCtx) -> dict:
    profile = state["profile"]
    candidates = [
        opportunity
        for opportunity in state.get("opportunities", [])
        if not opportunity.is_expired and opportunity.eligibility in ELIGIBLE
    ]
    candidates.sort(key=lambda opportunity: opportunity.score, reverse=True)

    graph = await get_graph_store(ctx)
    top: list[TopMatch] = []
    for rank, opportunity in enumerate(candidates[:5], start=1):
        try:
            paths = await graph.explain_paths(ctx.run_id, opportunity.id)
        except Exception as error:  # noqa: BLE001 - explanations are best-effort
            await ctx.log(f"Graph paths unavailable for {opportunity.name}: {error}")
            paths = []
        try:
            why = await ctx.llm(
                "ranker_explain",
                WhyFit,
                tier="smart",
                opportunity=opportunity,
                profile=profile,
                paths=paths,
            )
            explanation = why.why_it_fits
        except Exception as error:  # noqa: BLE001 - deterministic fallback keeps the run alive
            await ctx.log(f"Explanation fallback for {opportunity.name}: {error}")
            explanation = "; ".join(opportunity.fit_reasons) or (
                "Matches your profile based on the verified requirements."
            )
        top.append(
            TopMatch(rank=rank, opportunity=opportunity, why_it_fits=explanation, graph_paths=paths)
        )

    await ctx.log(f"Ranked {len(candidates)} eligible/partial opportunity/opportunities; top {len(top)} selected")
    return {"top5": top}
