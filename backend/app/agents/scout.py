"""Scout: run the plan's queries through search providers and dedupe candidates."""

from __future__ import annotations

import asyncio

from app.config import settings
from app.core.agent import AgentCtx, agent
from app.core.events import emit
from app.core.fallback import AllProvidersFailed
from app.core.utils import is_aggregator, normalize_url
from app.models.opportunity import Candidate
from app.tools.search import web_search

CONCURRENCY = 4


def _already_seen(state: dict) -> set[str]:
    seen = {normalize_url(candidate.url) for candidate in state.get("candidates", [])}
    seen |= {normalize_url(opportunity.official_url) for opportunity in state.get("opportunities", [])}
    seen |= {normalize_url(rejection.url) for rejection in state.get("rejected", [])}
    return seen


def _sort_key(candidate: Candidate) -> tuple[int, str]:
    if candidate.is_official_domain:
        rank = 0
    elif is_aggregator(candidate.url):
        rank = 2
    else:
        rank = 1
    return rank, candidate.url


@agent("scout")
async def scout(state: dict, ctx: AgentCtx) -> dict:
    tasks = state.get("plan", [])
    semaphore = asyncio.Semaphore(CONCURRENCY)

    async def search(task) -> list[Candidate]:
        async with semaphore:
            try:
                return await web_search(ctx, task.query, max_results=8)
            except AllProvidersFailed as error:
                await emit(
                    ctx.run_id,
                    "log",
                    f"No results for '{task.query}': {error}",
                    ctx.agent,
                    query=task.query,
                )
                return []

    batches = await asyncio.gather(*(search(task) for task in tasks))
    seen = _already_seen(state)
    new: list[Candidate] = []
    for batch in batches:
        for candidate in batch:
            key = normalize_url(candidate.url)
            if key in seen:
                continue
            seen.add(key)
            new.append(candidate)

    new.sort(key=_sort_key)
    new = new[: settings.max_candidates_per_round]
    for candidate in new:
        await emit(
            ctx.run_id,
            "candidate_found",
            f"{candidate.title} — {candidate.url}",
            ctx.agent,
            title=candidate.title,
            url=candidate.url,
            provider=candidate.provider,
            official=candidate.is_official_domain,
        )
    await ctx.log(f"{len(new)} new candidate(s) from {len(tasks)} query/queries")
    return {"candidates": new, "pending_verify": new}
