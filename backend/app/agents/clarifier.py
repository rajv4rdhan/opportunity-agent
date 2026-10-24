"""Clarifier: pauses the graph and asks the human for critical missing fields."""

from __future__ import annotations

from langgraph.types import interrupt

from app.core.agent import AgentCtx, agent
from app.models.profile import StudentProfile

QUESTIONS = {
    "target_countries": {
        "question": "Which countries are you targeting?",
        "type": "multi",
        "default": None,
    },
    "target_degree": {
        "question": "Which degree are you applying for (for example MS, PhD, MBA)?",
        "type": "text",
        "default": None,
    },
    "target_fields": {
        "question": "Which fields of study?",
        "type": "multi",
        "default": None,
    },
    "nationality": {
        "question": "What is your nationality?",
        "type": "text",
        "default": None,
    },
}
CRITICAL = tuple(QUESTIONS)


def critical_missing(profile: StudentProfile) -> list[str]:
    return [field for field in CRITICAL if not getattr(profile, field)]


def apply_answers(profile: StudentProfile, answers: dict) -> StudentProfile:
    for field, value in (answers or {}).items():
        if value in (None, "", []):
            continue
        if field in StudentProfile.model_fields:
            setattr(profile, field, value)
    return profile


@agent("clarifier")
async def clarifier(state: dict, ctx: AgentCtx) -> dict:
    profile = state["profile"]
    missing = critical_missing(profile)
    if not missing:
        return {}

    questions = [{"field": field, **QUESTIONS[field]} for field in missing]
    await ctx.log(f"Asking the human for: {', '.join(missing)}")
    answers = interrupt({"questions": questions})
    apply_answers(profile, answers or {})
    profile.missing_fields = [field for field in profile.missing_fields if field not in (answers or {})]
    return {"profile": profile, "clarification_answers": answers or {}}
