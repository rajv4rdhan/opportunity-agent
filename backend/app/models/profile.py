"""Student profile shapes, shared by the API, the agents and the UI."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator, model_validator


def _list(value: Any) -> list:
    return value if isinstance(value, list) else []


class Project(BaseModel):
    name: str
    description: str = ""
    tech: list[str] = Field(default_factory=list)
    url: str | None = None
    stars: int | None = None
    source: Literal["resume", "github", "form"] = "resume"

    @field_validator("tech", mode="before")
    @classmethod
    def _tech_list(cls, value: Any) -> list[str]:
        return _list(value)


class TestScores(BaseModel):
    ielts: float | None = None
    toefl: float | None = None
    pte: float | None = None
    duolingo: float | None = None
    gre: float | None = None
    gmat: float | None = None

    @field_validator("*", mode="before")
    @classmethod
    def _score_or_none(cls, value: Any) -> float | None:
        if value in (None, "", "n/a", "na", "none", "not taken", "unknown"):
            return None
        try:
            return float(value)
        except (TypeError, ValueError):
            return None


class StudentProfile(BaseModel):
    name: str
    email: str | None = None
    nationality: str | None = None
    current_degree: str | None = None
    major: str | None = None
    university: str | None = None
    graduation_year: int | None = None
    cgpa: float | None = None
    cgpa_scale: float = 10.0
    work_experience_years: float = 0
    skills: list[str] = Field(default_factory=list)
    projects: list[Project] = Field(default_factory=list)
    achievements: list[str] = Field(default_factory=list)
    publications: list[str] = Field(default_factory=list)
    test_scores: TestScores = Field(default_factory=TestScores)
    target_degree: str | None = None
    target_fields: list[str] = Field(default_factory=list)
    target_countries: list[str] = Field(default_factory=list)
    budget_inr_per_year: int | None = None
    github_url: str | None = None
    linkedin_url: str | None = None
    other_links: list[str] = Field(default_factory=list)
    missing_fields: list[str] = Field(default_factory=list)
    notes: str | None = None

    @model_validator(mode="before")
    @classmethod
    def _coerce_lists_and_numbers(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data
        for key in (
            "skills",
            "projects",
            "achievements",
            "publications",
            "target_fields",
            "target_countries",
            "other_links",
            "missing_fields",
        ):
            if data.get(key) is None:
                data[key] = []
        if data.get("cgpa_scale") in (None, "", 0, "0"):
            data["cgpa_scale"] = 10.0
        if data.get("work_experience_years") is None:
            data["work_experience_years"] = 0
        for key in ("cgpa", "budget_inr_per_year", "graduation_year"):
            if data.get(key) in ("", "unknown", "n/a"):
                data[key] = None
        return data


class GitHubInsights(BaseModel):
    username: str
    public_repos: int = 0
    followers: int = 0
    top_languages: dict[str, int] = Field(default_factory=dict)
    notable_repos: list[Project] = Field(default_factory=list)
    inferred_skills: list[str] = Field(default_factory=list)
    hidden_gems: list[str] = Field(default_factory=list)
    activity_summary: str = ""
    strength_summary: str = ""

    @model_validator(mode="before")
    @classmethod
    def _coerce_collections(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data
        for key in ("public_repos", "followers"):
            if data.get(key) is None:
                data[key] = 0
        for key in ("top_languages",):
            if data.get(key) is None:
                data[key] = {}
        for key in ("notable_repos", "inferred_skills", "hidden_gems"):
            if data.get(key) is None:
                data[key] = []
        return data
