"""Finalizer: build the report, persist it, mark the run finished."""

from __future__ import annotations

from app.core import store
from app.core.agent import AgentCtx, agent
from app.core.events import get_stats
from app.services.report import build_report


@agent("finalizer")
async def finalizer(state: dict, ctx: AgentCtx) -> dict:
    report = build_report(state, get_stats(ctx.run_id))
    await store.update_run(ctx.run_id, report_json=report.model_dump(mode="json"), status="finished")
    await ctx.log(
        f"Report ready: {len(report.top5)} top match(es), "
        f"{len(report.all_opportunities)} opportunity/opportunities, SOP {'yes' if report.sop_markdown else 'no'}"
    )
    return {}
