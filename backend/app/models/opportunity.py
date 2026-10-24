"""Opportunity, requirement and research shapes."""

from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field

RequirementKey = Literal[
    "min_gpa",
    "english_test",
    "gre",
    "gmat",
    "nationality",
    "degree_field",
    "work_experience",
    "age",
    "other",
]


class Source(BaseModel):
    url: str
    quote: str
    fetch_method: Literal["jina", "firecrawl", "browser", "cache", "search_snippet"]
    fetched_at: datetime


class Requirement(BaseModel):
    key: RequirementKey
    description: str
    numeric_value: float | None = None
    numeric_scale: float | None = None
    test_name: str | None = None
    met: Literal["yes", "no", "unknown"] = "unknown"
    evidence: str = ""
    quote: str = ""


class ResearchTask(BaseModel):
    query: str
    country: str | None = None
    kind: Literal["scholarship", "program", "fellowship", "assistantship"]
    rationale: str


class Candidate(BaseModel):
    title: str
    url: str
    snippet: str = ""
    provider: str
    query: str
    is_official_domain: bool = False


class Opportunity(BaseModel):
    id: str
    name: str
    provider_org: str
    country: str | None = None
    kind: Literal["scholarship", "program", "fellowship", "assistantship"]
    degree_levels: list[str] = Field(default_factory=list)
    fields: list[str] = Field(default_factory=list)
    funding_type: Literal["full", "partial", "tuition_waiver", "stipend", "loan", "unknown"]
    funding_text: str = ""
    funding_amount_inr_estimate: int | None = None
    deadline: date | None = None
    deadline_text: str = ""
    intake: str | None = None
    requirements: list[Requirement] = Field(default_factory=list)
    required_documents: list[str] = Field(default_factory=list)
    how_to_apply: list[str] = Field(default_factory=list)
    application_url: str | None = None
    official_url: str
    sources: list[Source] = Field(default_factory=list)
    valued_skills: list[str] = Field(default_factory=list)
    verification: Literal["verified_official", "third_party", "unverified"]
    confidence: float = 0.0
    is_expired: bool = False

    # Filled by the deterministic matcher.
    eligibility: Literal["eligible", "partial", "not_eligible", "unknown"] = "unknown"
    score: float = 0.0
    fit_reasons: list[str] = Field(default_factory=list)
    missing: list[str] = Field(default_factory=list)


class Rejection(BaseModel):
    url: str
    reason: str


class Gap(BaseModel):
    requirement: str
    unlocks: list[str] = Field(default_factory=list)
    suggestion: str = ""
