"""Pure supervisor decisions (unit-tested) and the nodes that apply them."""

from __future__ import annotations

from langgraph.types import Send

from app.agents.clarifier import critical_missing
from app.config import settings
from app.core.agent import AgentCtx, agent
from app.models.state import SwarmState, VerifyInput


def after_profile(state: SwarmState) -> str:
    profile = state.get("profile")
    if profile is None:
        return "end"
    return "clarifier" if critical_missing(profile) else "github_enricher"


def fan_out_verifiers(state: SwarmState) -> list[Send]:
    pending = state.get("pending_verify", [])
    if not pending:
        return [Send("matcher", state)]
    return [
        Send(
            "verifier",
            VerifyInput(
                run_id=state["run_id"],
                chaos=state.get("chaos", {}),
                profile=state["profile"],
                candidate=candidate,
            ),
        )
        for candidate in pending
    ]


def after_matcher(state: SwarmState) -> str:
    verified = [
        opportunity
        for opportunity in state.get("opportunities", [])
        if opportunity.verification != "unverified" and not opportunity.is_expired
    ]
    good = [
        opportunity
        for opportunity in verified
        if opportunity.eligibility in {"eligible", "partial"}
    ]
    if len(verified) >= settings.min_verified_target and len(good) >= settings.min_eligible_target:
        return "ranker"
    if state.get("scout_round", 0) >= settings.max_scout_rounds:
        return "ranker"
    return "planner"


def after_critic(state: SwarmState) -> str:
    if state.get("critic_passed") or state.get("sop_revisions", 0) >= settings.max_sop_revisions:
        return "finalizer"
    return "sop_writer"


def next_node(state: SwarmState) -> str:
    return state["next"]


@agent("supervisor")
async def profile_supervisor(state: SwarmState, ctx: AgentCtx) -> dict:
    decision = after_profile(state)
    if decision == "end":
        await ctx.decide("Profile extraction failed → stopping the run")
    elif decision == "clarifier":
        await ctx.decide("Critical profile fields are missing → asking the human")
    else:
        await ctx.decide("Profile is complete → enriching with GitHub")
    return {"next": decision}


@agent("supervisor")
async def matcher_supervisor(state: SwarmState, ctx: AgentCtx) -> dict:
    if not state.get("profile"):
        await ctx.decide("Profile is missing → stopping instead of re-planning")
        return {"next": "end"}
    decision = after_matcher(state)
    verified = [
        opportunity
        for opportunity in state.get("opportunities", [])
        if opportunity.verification != "unverified" and not opportunity.is_expired
    ]
    good = [
        opportunity
        for opportunity in verified
        if opportunity.eligibility in {"eligible", "partial"}
    ]
    if decision == "planner":
        feedback = (
            f"Only {len(verified)} verified opportunity/opportunities "
            f"({len(good)} eligible or partial), target is {settings.min_verified_target} verified and "
            f"{settings.min_eligible_target} eligible/partial. Broaden the next round: more countries, "
            "partial funding, adjacent fields. Do not repeat the covered queries."
        )
        await ctx.decide(
            f"Round {state.get('scout_round', 0)}: {len(verified)} verified / {len(good)} good → re-planning"
        )
    elif state.get("scout_round", 0) >= settings.max_scout_rounds and (
        len(verified) < settings.min_verified_target or len(good) < settings.min_eligible_target
    ):
        feedback = (
            f"Round limit reached with {len(verified)} verified / {len(good)} good. "
            "Proceed with what we have and say so in the report."
        )
        await ctx.decide(
            f"Round limit reached: {len(verified)} verified / {len(good)} good → ranking what we have"
        )
    else:
        feedback = ""
        await ctx.decide(
            f"Targets met: {len(verified)} verified / {len(good)} good → ranking the top matches"
        )
    return {"planner_feedback": feedback, "next": decision}


@agent("supervisor")
async def critic_supervisor(state: SwarmState, ctx: AgentCtx) -> dict:
    decision = after_critic(state)
    if decision == "sop_writer":
        await ctx.decide(
            f"Critic found {len(state.get('critic_notes', []))} issue(s) → revising the SOP "
            f"(revision {state.get('sop_revisions', 0)}/{settings.max_sop_revisions})"
        )
    else:
        await ctx.decide("SOP accepted → building the final report")
    return {"next": decision}
