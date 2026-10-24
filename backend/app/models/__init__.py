"""Shared Pydantic models. Import from here, never redefine shapes elsewhere."""

from app.models.events import Event, EventType
from app.models.inputs import RunForm
from app.models.opportunity import (
    Candidate,
    Gap,
    Opportunity,
    Rejection,
    Requirement,
    RequirementKey,
    ResearchTask,
    Source,
)
from app.models.profile import GitHubInsights, Project, StudentProfile, TestScores
from app.models.report import FinalReport, RunStats, TopMatch
from app.models.state import SwarmState, VerifyInput, add_unique_candidates, merge_by_id

__all__ = [
    "Candidate",
    "Event",
    "EventType",
    "FinalReport",
    "Gap",
    "GitHubInsights",
    "Opportunity",
    "Project",
    "Rejection",
    "Requirement",
    "RequirementKey",
    "ResearchTask",
    "RunForm",
    "RunStats",
    "Source",
    "StudentProfile",
    "SwarmState",
    "TestScores",
    "TopMatch",
    "VerifyInput",
    "add_unique_candidates",
    "merge_by_id",
]
