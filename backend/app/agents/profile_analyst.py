"""Profile Analyst: documents + form → structured StudentProfile."""

from __future__ import annotations

from pathlib import Path

from app.core.agent import AgentCtx, agent
from app.models.profile import StudentProfile
from app.tools.pdf import extract_document

FORM_FIELDS = (
    "github_url",
    "linkedin_url",
    "other_links",
    "target_countries",
    "target_degree",
    "target_fields",
    "nationality",
    "budget_inr_per_year",
    "notes",
)


def merge_form(profile: StudentProfile, form: dict) -> StudentProfile:
    """Form values override whatever the LLM read from the documents."""
    for field in FORM_FIELDS:
        value = form.get(field)
        if value not in (None, "", []):
            setattr(profile, field, value)
    for key, value in (form.get("test_scores") or {}).items():
        if value is not None and hasattr(profile.test_scores, key):
            setattr(profile.test_scores, key, value)
    return profile


def compute_missing(profile: StudentProfile) -> list[str]:
    missing = [
        field
        for field in ("target_countries", "target_degree", "target_fields", "nationality", "cgpa")
        if not getattr(profile, field)
    ]
    if all(value is None for value in profile.test_scores.model_dump().values()):
        missing.append("test_scores")
    return missing


@agent("profile_analyst")
async def profile_analyst(state: dict, ctx: AgentCtx) -> dict:
    inputs = state.get("inputs", {})
    form = inputs.get("form") or {}
    resume_text, resume_images = "", None
    transcript_text = ""

    resume_path = inputs.get("resume_path")
    if resume_path and Path(resume_path).exists():
        resume_text, resume_images = await extract_document(ctx, Path(resume_path))
    transcript_path = inputs.get("transcript_path")
    if transcript_path and Path(transcript_path).exists():
        transcript_text, _ = await extract_document(ctx, Path(transcript_path))

    await ctx.log(f"Read resume: {len(resume_text)} chars; transcript: {len(transcript_text)} chars")
    profile = await ctx.llm(
        "profile_extract",
        StudentProfile,
        tier="fast",
        resume=resume_text or "(not provided)",
        transcript=transcript_text or "(not provided)",
        form=form,
        images=resume_images,
    )
    profile = merge_form(profile, form)
    profile.missing_fields = compute_missing(profile)
    if profile.missing_fields:
        await ctx.log(f"Missing profile fields: {', '.join(profile.missing_fields)}")
    return {"profile": profile}
