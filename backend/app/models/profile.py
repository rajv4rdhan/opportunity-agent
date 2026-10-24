"""Student profile shapes, shared by the API, the agents and the UI."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class Project(BaseModel):
    name: str
    description: str = ""
    tech: list[str] = Field(default_factory=list)
    url: str | None = None
    stars: int | None = None
    source: Literal["resume", "github", "form"] = "resume"


class TestScores(BaseModel):
    ielts: float | None = None
    toefl: float | None = None
    pte: float | None = None
    duolingo: float | None = None
    gre: float | None = None
    gmat: float | None = None


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
