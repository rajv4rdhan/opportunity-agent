"""Opportunity, requirement and research shapes."""

from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Any, Literal

from dateutil import parser as date_parser
from pydantic import BaseModel, Field, field_validator, model_validator

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

LIST_FIELDS = (
    "degree_levels",
    "fields",
    "requirements",
    "required_documents",
    "how_to_apply",
    "sources",
    "valued_skills",
    "fit_reasons",
    "missing",
)


def _text(value: Any) -> str:
    return str(value or "").lower().replace("-", " ").replace("_", " ").strip()


class Source(BaseModel):
    url: str
    quote: str = ""
    fetch_method: Literal["jina", "firecrawl", "browser", "cache", "search_snippet"] = "jina"
    fetched_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @field_validator("fetch_method", mode="before")
    @classmethod
    def _normalize_method(cls, value: Any) -> str:
        text = _text(value)
        for method in ("jina", "firecrawl", "browser", "cache", "search_snippet"):
            if method in text:
                return method
        if "fire" in text:
            return "firecrawl"
        if "playwright" in text or "kernel" in text:
            return "browser"
        return "jina"

    @field_validator("fetched_at", mode="before")
    @classmethod
    def _parse_fetched_at(cls, value: Any) -> datetime:
        if isinstance(value, datetime):
            return value
        if not value:
            return datetime.now(timezone.utc)
        try:
            return date_parser.parse(str(value))
        except (ValueError, OverflowError, TypeError):
            return datetime.now(timezone.utc)


class Requirement(BaseModel):
    key: RequirementKey = "other"
    description: str
    numeric_value: float | None = None
    numeric_scale: float | None = None
    test_name: str | None = None
    met: Literal["yes", "no", "unknown"] = "unknown"
    evidence: str = ""
    quote: str = ""

    @field_validator("key", mode="before")
    @classmethod
    def _normalize_key(cls, value: Any) -> str:
        text = _text(value)
        aliases = {
            "min_gpa": "min_gpa",
            "gpa": "min_gpa",
            "grade": "min_gpa",
            "english_test": "english_test",
            "english": "english_test",
            "ielts": "english_test",
            "toefl": "english_test",
            "language": "english_test",
            "gre": "gre",
            "gmat": "gmat",
            "nationality": "nationality",
            "citizen": "nationality",
            "degree_field": "degree_field",
            "degree": "degree_field",
            "field": "degree_field",
            "major": "degree_field",
            "work_experience": "work_experience",
            "work": "work_experience",
            "experience": "work_experience",
            "age": "age",
            "other": "other",
        }
        for token, key in aliases.items():
            if token in text:
                return key
        return "other"

    @field_validator("met", mode="before")
    @classmethod
    def _normalize_met(cls, value: Any) -> str:
        if value is True:
            return "yes"
        if value is False:
            return "no"
        text = _text(value)
        if text in {"yes", "true", "met", "satisfied"}:
            return "yes"
        if text in {"no", "false", "not met", "unsatisfied"}:
            return "no"
        return "unknown"

    @field_validator("numeric_value", "numeric_scale", mode="before")
    @classmethod
    def _numeric_or_none(cls, value: Any) -> float | None:
        if value in (None, "", "unknown", "n/a"):
            return None
        try:
            return float(value)
        except (TypeError, ValueError):
            return None


class ResearchTask(BaseModel):
    query: str
    country: str | None = None
    kind: Literal["scholarship", "program", "fellowship", "assistantship"] = "scholarship"
    rationale: str = ""

    @field_validator("kind", mode="before")
    @classmethod
    def _normalize_kind(cls, value: Any) -> str:
        text = _text(value)
        if "fellow" in text:
            return "fellowship"
        if "assistant" in text:
            return "assistantship"
        if "program" in text or "phd" in text or "master" in text or "degree" in text:
            return "program"
        return "scholarship"


class Candidate(BaseModel):
    title: str
    url: str
    snippet: str = ""
    provider: str
    query: str
    is_official_domain: bool = False


class Opportunity(BaseModel):
    id: str = ""
    name: str
    provider_org: str
    country: str | None = None
    kind: Literal["scholarship", "program", "fellowship", "assistantship"] = "scholarship"
    degree_levels: list[str] = Field(default_factory=list)
    fields: list[str] = Field(default_factory=list)
    funding_type: Literal["full", "partial", "tuition_waiver", "stipend", "loan", "unknown"] = "unknown"
    funding_text: str = ""
    funding_amount_inr_estimate: int | None = None
    deadline: date | None = None
    deadline_text: str = ""
    intake: str | None = None
    requirements: list[Requirement] = Field(default_factory=list)
    required_documents: list[str] = Field(default_factory=list)
    how_to_apply: list[str] = Field(default_factory=list)
    application_url: str | None = None
    official_url: str = ""
    sources: list[Source] = Field(default_factory=list)
    valued_skills: list[str] = Field(default_factory=list)
    verification: Literal["verified_official", "third_party", "unverified"] = "unverified"
    confidence: float = 0.0
    is_expired: bool = False

    # Filled by the deterministic matcher.
    eligibility: Literal["eligible", "partial", "not_eligible", "unknown"] = "unknown"
    score: float = 0.0
    fit_reasons: list[str] = Field(default_factory=list)
    missing: list[str] = Field(default_factory=list)

    @model_validator(mode="before")
    @classmethod
    def _coerce_lists(cls, data: Any) -> Any:
        if isinstance(data, dict):
            for key in LIST_FIELDS:
                if data.get(key) is None:
                    data[key] = []
        return data

    @field_validator("kind", mode="before")
    @classmethod
    def _normalize_kind(cls, value: Any) -> str:
        text = _text(value)
        if "fellow" in text:
            return "fellowship"
        if "assistant" in text:
            return "assistantship"
        if "program" in text or "phd" in text or "master" in text or "degree" in text:
            return "program"
        return "scholarship"

    @field_validator("funding_type", mode="before")
    @classmethod
    def _normalize_funding(cls, value: Any) -> str:
        text = _text(value)
        if "tuition" in text and "waiv" in text:
            return "tuition_waiver"
        if "full" in text or "fully" in text:
            return "full"
        if "stipend" in text or "salary" in text or "assistantship" in text:
            return "stipend"
        if "loan" in text:
            return "loan"
        if "partial" in text:
            return "partial"
        return "unknown"

    @field_validator("verification", mode="before")
    @classmethod
    def _normalize_verification(cls, value: Any) -> str:
        text = _text(value)
        if "official" in text:
            return "verified_official"
        if "third" in text or "aggregator" in text:
            return "third_party"
        return "unverified"

    @field_validator("deadline", mode="before")
    @classmethod
    def _parse_deadline(cls, value: Any) -> date | None:
        if isinstance(value, date):
            return value
        if value in (None, "", "unknown", "rolling", "n/a"):
            return None
        try:
            return date_parser.parse(str(value), fuzzy=True).date()
        except (ValueError, OverflowError, TypeError):
            return None

    @field_validator("confidence", mode="before")
    @classmethod
    def _clamp_confidence(cls, value: Any) -> float:
        try:
            number = float(value)
        except (TypeError, ValueError):
            return 0.0
        return min(1.0, max(0.0, number))


class Rejection(BaseModel):
    url: str
    reason: str


class Gap(BaseModel):
    requirement: str
    unlocks: list[str] = Field(default_factory=list)
    suggestion: str = ""
