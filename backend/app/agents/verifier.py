"""Verifier: fetch one candidate page, extract claims with quotes, check eligibility."""

from __future__ import annotations

from datetime import date, datetime, timezone
from urllib.parse import urljoin

from app.core.agent import AgentCtx, agent
from app.core.events import emit
from app.core.fallback import AllProvidersFailed
from app.core.utils import is_official_domain, quote_supported, slugify, truncate
from app.models.agent_outputs import VerifierOutput
from app.models.opportunity import Opportunity, Rejection, Source
from app.models.profile import StudentProfile
from app.services.matching import expired
from app.tools.fetch import PageContent, fetch_page


async def _extract(ctx: AgentCtx, page: PageContent, profile: StudentProfile) -> VerifierOutput:
    return await ctx.llm(
        "verifier_extract",
        VerifierOutput,
        tier="fast",
        today=date.today().isoformat(),
        url=page.final_url,
        profile_summary=profile.model_dump_json(indent=2),
        page=truncate(page.text, 15000),
    )


def _check_quotes(opportunity: Opportunity, text: str) -> Opportunity:
    confidence = opportunity.confidence if opportunity.confidence is not None else 0.5
    for source in opportunity.sources:
        if source.quote and not quote_supported(source.quote, text):
            source.quote = ""
            confidence -= 0.15
    for requirement in opportunity.requirements:
        if requirement.quote and not quote_supported(requirement.quote, text):
            requirement.quote = ""
            requirement.evidence = f"unverified: {requirement.evidence}" if requirement.evidence else "unverified"
            confidence -= 0.15
    opportunity.confidence = round(max(0.0, min(1.0, confidence)), 2)
    return opportunity


@agent("verifier")
async def verifier(state: dict, ctx: AgentCtx) -> dict:
    candidate = state["candidate"]
    profile = state["profile"]
    try:
        page = await fetch_page(ctx, candidate.url)
    except AllProvidersFailed as error:
        await emit(
            ctx.run_id,
            "opportunity_rejected",
            f"Unreachable: {candidate.url}",
            ctx.agent,
            url=candidate.url,
            reason=str(error),
        )
        return {"rejected": [Rejection(url=candidate.url, reason="unreachable")]}

    result = await _extract(ctx, page, profile)
    official: PageContent | None = None
    if result.official_url:
        official_url = urljoin(page.final_url, result.official_url)
        if official_url.rstrip("/") != page.final_url.rstrip("/"):
            try:
                official = await fetch_page(ctx, official_url)
                result = await _extract(ctx, official, profile)
            except AllProvidersFailed as error:
                await ctx.log(f"Official page unreachable ({official_url}): {error}")

    if not result.is_relevant or result.opportunity is None:
        reason = result.reason or "not relevant to this student"
        await emit(
            ctx.run_id,
            "opportunity_rejected",
            f"Rejected {candidate.url}: {reason}",
            ctx.agent,
            url=candidate.url,
            reason=reason,
        )
        return {"rejected": [Rejection(url=candidate.url, reason=reason)]}

    opportunity = result.opportunity
    final_url = official.final_url if official else page.final_url
    combined_text = page.text + ("\n\n" + official.text if official else "")
    now = datetime.now(timezone.utc)
    for source in opportunity.sources:
        source.fetched_at = now
        source.fetch_method = official.method if official else page.method

    opportunity.id = slugify(f"{opportunity.name} {opportunity.provider_org}")[:120]
    opportunity.official_url = final_url
    opportunity.verification = (
        "verified_official" if is_official_domain(final_url) else "third_party"
    )
    if not opportunity.sources:
        opportunity.verification = "unverified"
        opportunity.sources = [
            Source(url=final_url, quote="", fetch_method=page.method, fetched_at=now)
        ]
    _check_quotes(opportunity, combined_text)
    opportunity.is_expired = expired(opportunity.deadline)

    await emit(
        ctx.run_id,
        "opportunity_verified",
        f"{opportunity.name} — {opportunity.funding_type.replace('_', ' ')} funding, "
        f"deadline {opportunity.deadline or 'unknown'}, confidence {opportunity.confidence:.0%}",
        ctx.agent,
        name=opportunity.name,
        url=final_url,
        funding=opportunity.funding_type,
        deadline=str(opportunity.deadline) if opportunity.deadline else None,
        confidence=opportunity.confidence,
        verification=opportunity.verification,
    )
    return {"opportunities": [opportunity]}
