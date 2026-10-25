"""Deterministic eligibility, scoring and gap analysis (no LLM calls)."""

from __future__ import annotations

from datetime import date, datetime, timezone

from app.core import store
from app.core.utils import days_until
from app.models.opportunity import Gap, Opportunity, Requirement
from app.models.profile import GitHubInsights, StudentProfile
from app.models.report import FinalReport

ELIGIBILITY_POINTS = {"eligible": 40, "partial": 25, "unknown": 15, "not_eligible": 0}
FUNDING_POINTS = {"full": 25, "stipend": 20, "tuition_waiver": 18, "partial": 12, "loan": 5, "unknown": 5}
TRUST_MULTIPLIER = {"verified_official": 1.0, "third_party": 0.8, "unverified": 0.5}
OBTAINABLE_KEYS = {"english_test", "gre", "gmat"}
TEST_KEYS = ("ielts", "toefl", "pte", "duolingo", "gre", "gmat")
COUNTRY_ALIASES = {
    "us": "united states",
    "usa": "united states",
    "u.s.": "united states",
    "united states of america": "united states",
    "uk": "united kingdom",
    "great britain": "united kingdom",
    "england": "united kingdom",
    "south korea": "south korea",
    "korea": "south korea",
    "uae": "united arab emirates",
}
GLOBAL_COUNTRIES = {
    "global",
    "worldwide",
    "international",
    "online",
    "remote",
    "any",
    "multiple",
    "europe",
    "european union",
    "eu",
    "asia",
    "africa",
    "north america",
    "south america",
    "latin america",
    "middle east",
    "oceania",
}


def _countries(value: str | None) -> set[str]:
    text = (value or "").casefold().strip()
    if not text:
        return set()
    normalized = COUNTRY_ALIASES.get(text, text)
    return {part.strip() for part in normalized.replace(";", ",").replace("|", ",").split(",") if part.strip()}


def _country_matches(opportunity: Opportunity, profile: StudentProfile) -> bool:
    """False only when both sides name countries and none overlap."""
    if not profile.target_countries or not opportunity.country:
        return True
    wanted = {
        COUNTRY_ALIASES.get(country.casefold().strip(), country.casefold().strip())
        for country in profile.target_countries
    }
    offered = _countries(opportunity.country)
    if not offered or offered & GLOBAL_COUNTRIES:
        return True
    return bool(wanted & offered)


def _test_key(requirement: Requirement) -> str | None:
    haystack = f"{requirement.test_name or ''} {requirement.description}".lower()
    return next((key for key in TEST_KEYS if key in haystack), None)


def _student_on_scale(profile: StudentProfile, requirement: Requirement) -> float | None:
    if profile.cgpa is None or not profile.cgpa_scale or not requirement.numeric_scale:
        return None
    return profile.cgpa / profile.cgpa_scale * requirement.numeric_scale


def evaluate_requirement(requirement: Requirement, profile: StudentProfile) -> Requirement:
    """Override the LLM's verdict whenever deterministic comparison is possible."""
    updated = requirement.model_copy(deep=True)
    if requirement.key == "min_gpa" and requirement.numeric_value is not None:
        converted = _student_on_scale(profile, requirement)
        if converted is not None:
            updated.met = "yes" if converted >= requirement.numeric_value else "no"
            updated.evidence = (
                f"CGPA {profile.cgpa:g}/{profile.cgpa_scale:g} is about {converted:.2f}/"
                f"{requirement.numeric_scale:g} (approximate conversion); required {requirement.numeric_value:g}"
            )
    elif requirement.key == "english_test":
        key = _test_key(requirement)
        score = getattr(profile.test_scores, key) if key else None
        if key and score is not None and requirement.numeric_value is not None:
            updated.met = "yes" if score >= requirement.numeric_value else "no"
            updated.evidence = f"{key.upper()} {score:g} vs required {requirement.numeric_value:g}"
        elif key and score is None:
            description = requirement.description.lower()
            if "waiver" in description or "medium of instruction" in description:
                updated.met = "unknown"
                updated.evidence = "A waiver may be possible; verify with the university"
            else:
                updated.met = "no"
                updated.evidence = f"No {key.upper()} score provided"
    elif requirement.key in {"gre", "gmat"} and requirement.numeric_value is not None:
        score = getattr(profile.test_scores, requirement.key)
        if score is not None:
            updated.met = "yes" if score >= requirement.numeric_value else "no"
            updated.evidence = f"{requirement.key.upper()} {score:g} vs required {requirement.numeric_value:g}"
        else:
            updated.met = "no"
            updated.evidence = f"No {requirement.key.upper()} score provided"
    elif requirement.key == "work_experience" and requirement.numeric_value is not None:
        updated.met = "yes" if profile.work_experience_years >= requirement.numeric_value else "no"
        updated.evidence = (
            f"{profile.work_experience_years:g} year(s) of experience vs required {requirement.numeric_value:g}"
        )
    return updated


def _obtainable(requirement: Requirement, profile: StudentProfile) -> bool:
    if requirement.key in OBTAINABLE_KEYS:
        return True
    if requirement.key == "min_gpa" and requirement.numeric_value is not None:
        converted = _student_on_scale(profile, requirement)
        return converted is not None and converted >= requirement.numeric_value * 0.95
    return False


def _skill_overlap(opportunity: Opportunity, profile: StudentProfile) -> set[str]:
    student_skills = {skill.lower() for skill in profile.skills}
    for project in profile.projects:
        student_skills.update(tech.lower() for tech in project.tech)
    return student_skills & {skill.lower() for skill in opportunity.valued_skills}


def evaluate_opportunity(
    opportunity: Opportunity, profile: StudentProfile, github: GitHubInsights | None = None
) -> Opportunity:
    updated = opportunity.model_copy(deep=True)
    updated.requirements = [evaluate_requirement(req, profile) for req in opportunity.requirements]
    rejected = [req for req in updated.requirements if req.met == "no"]

    country_mismatch = not opportunity.is_expired and not _country_matches(opportunity, profile)
    if opportunity.is_expired:
        updated.eligibility = "not_eligible"
        updated.missing = ["Deadline has passed"]
    else:
        if country_mismatch:
            updated.eligibility = "not_eligible"
        elif any(req.key in {"nationality", "degree_field"} for req in rejected):
            updated.eligibility = "not_eligible"
        elif not rejected:
            updated.eligibility = "eligible"
        elif len(rejected) <= 2 and all(_obtainable(req, profile) for req in rejected):
            updated.eligibility = "partial"
        else:
            updated.eligibility = "not_eligible"
        requirements_missing = [req.description for req in updated.requirements if req.met in {"no", "unknown"}]
        updated.missing = (
            [f"Located in {opportunity.country}, outside your target countries"]
            if country_mismatch
            else []
        ) + requirements_missing

    overlap = _skill_overlap(opportunity, profile)
    reasons: list[str] = []
    if overlap:
        reasons.append(f"Your experience with {', '.join(sorted(overlap)[:4])} matches what this opportunity values")
    if opportunity.funding_type != "unknown":
        reasons.append(f"{opportunity.funding_type.replace('_', ' ').title()} funding")
    if opportunity.country and opportunity.country in profile.target_countries:
        reasons.append(f"Located in {opportunity.country}, one of your target countries")
    updated.fit_reasons = reasons[:3]
    updated.score = score(updated, profile)
    return updated


def score(opportunity: Opportunity, profile: StudentProfile) -> float:
    """0–100 fit score. Deterministic, so the What-If slider is consistent."""
    if opportunity.is_expired:
        return 0.0
    overlap = _skill_overlap(opportunity, profile)
    eligibility_pts = ELIGIBILITY_POINTS[opportunity.eligibility]
    funding_pts = FUNDING_POINTS[opportunity.funding_type]
    skill_pts = min(20, 5 * len(overlap))
    remaining = days_until(opportunity.deadline, today=datetime.now(timezone.utc).date())
    deadline_pts = 15 if remaining is None else (15 if remaining >= 45 else 8 if remaining >= 14 else 2)
    trust = TRUST_MULTIPLIER[opportunity.verification]
    raw = (eligibility_pts + funding_pts + skill_pts + deadline_pts) * trust * (0.5 + 0.5 * opportunity.confidence)
    return round(min(100.0, max(0.0, raw)), 1)


def _gap_label(requirement: Requirement) -> str:
    if requirement.key == "english_test":
        key = (_test_key(requirement) or "english test").upper()
        if requirement.numeric_value is not None:
            return f"{key} >= {requirement.numeric_value:g}"
    if requirement.key in {"min_gpa", "gre", "gmat"} and requirement.numeric_value is not None:
        scale = f"/{requirement.numeric_scale:g}" if requirement.numeric_scale else ""
        return f"{requirement.key.replace('_', ' ').upper()} >= {requirement.numeric_value:g}{scale}"
    return requirement.description


def _suggestion(requirement: Requirement) -> str:
    if requirement.key == "english_test":
        return "Book an English test; results usually take about two weeks."
    if requirement.key in {"gre", "gmat"}:
        return "Register for the test and target the required score."
    if requirement.key == "min_gpa":
        return "Improve your GPA if possible, or ask about conditional admission."
    if requirement.key == "work_experience":
        return "Gain relevant work experience or look for programs that waive it."
    return "Check the official page for alternatives or a waiver."


def compute_gaps(opportunities: list[Opportunity]) -> list[Gap]:
    groups: dict[str, dict] = {}
    for opportunity in opportunities:
        if opportunity.eligibility != "partial":
            continue
        for requirement in opportunity.requirements:
            if requirement.met != "no":
                continue
            label = _gap_label(requirement)
            group = groups.setdefault(label, {"unlocks": [], "suggestion": _suggestion(requirement)})
            if opportunity.name not in group["unlocks"]:
                group["unlocks"].append(opportunity.name)
    gaps = [
        Gap(requirement=label, unlocks=value["unlocks"], suggestion=value["suggestion"])
        for label, value in groups.items()
    ]
    return sorted(gaps, key=lambda gap: len(gap.unlocks), reverse=True)


def apply_overrides(profile: StudentProfile, overrides: dict) -> StudentProfile:
    data = profile.model_dump()
    for key, value in (overrides or {}).items():
        if key.startswith("test_scores."):
            test = key.split(".", 1)[1]
            if test in data["test_scores"]:
                data["test_scores"][test] = value
        elif key in StudentProfile.model_fields and key != "test_scores":
            data[key] = value
    return StudentProfile.model_validate(data)


async def whatif(run_id: str, overrides: dict) -> tuple[list[Opportunity], list[Gap]]:
    """Recompute eligibility/scores with hypothetical profile changes (instant)."""
    run = await store.get_run(run_id)
    if not run or not run.get("report"):
        return [], []
    report = FinalReport.model_validate(run["report"])
    profile = apply_overrides(report.profile, overrides)
    updated = [evaluate_opportunity(opportunity, profile, report.github) for opportunity in report.all_opportunities]
    return updated, compute_gaps(updated)


def expired(deadline: date | None, today: date | None = None) -> bool:
    if deadline is None:
        return False
    return deadline < (today or datetime.now(timezone.utc).date())
