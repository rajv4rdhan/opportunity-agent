"""LangGraph shared state (the blackboard) and its reducers."""

from __future__ import annotations

import operator
from typing import Annotated, TypedDict

from app.core.utils import normalize_url
from app.models.opportunity import Candidate, Gap, Opportunity, Rejection, ResearchTask
from app.models.profile import GitHubInsights, StudentProfile
from app.models.report import TopMatch


def merge_by_id(left: list[Opportunity], right: list[Opportunity]) -> list[Opportunity]:
    """Reducer: a newer item with the same id replaces the older; order is kept."""
    merged = list(left)
    index = {item.id: position for position, item in enumerate(merged)}
    for item in right:
        if item.id in index:
            merged[index[item.id]] = item
        else:
            index[item.id] = len(merged)
            merged.append(item)
    return merged


def add_unique_candidates(left: list[Candidate], right: list[Candidate]) -> list[Candidate]:
    """Reducer: dedupe candidates by normalised URL."""
    merged = list(left)
    seen = {normalize_url(item.url) for item in merged}
    for item in right:
        key = normalize_url(item.url)
        if key not in seen:
            seen.add(key)
            merged.append(item)
    return merged


class SwarmState(TypedDict, total=False):
    run_id: str
    inputs: dict
    chaos: dict[str, bool]
    profile: StudentProfile
    github: GitHubInsights | None
    clarification_answers: dict
    plan: list[ResearchTask]
    planner_feedback: str
    scout_round: int
    candidates: Annotated[list[Candidate], add_unique_candidates]
    pending_verify: list[Candidate]
    opportunities: Annotated[list[Opportunity], merge_by_id]
    rejected: Annotated[list[Rejection], operator.add]
    gaps: list[Gap]
    top5: list[TopMatch]
    sop_markdown: str
    sop_for: str
    critic_notes: list[str]
    critic_passed: bool
    sop_revisions: int
    errors: Annotated[list[dict], operator.add]
    next: str


class VerifyInput(TypedDict):
    run_id: str
    chaos: dict[str, bool]
    profile: StudentProfile
    candidate: Candidate
