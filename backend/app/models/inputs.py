"""User input shape, shared by the REST API and the NiceGUI launch form."""

from __future__ import annotations

from pydantic import BaseModel, Field

from app.models.profile import TestScores


class RunForm(BaseModel):
    sample: str | None = None
    github_url: str | None = None
    linkedin_url: str | None = None
    other_links: list[str] = Field(default_factory=list)
    target_countries: list[str] = Field(default_factory=list)
    target_degree: str | None = None
    target_fields: list[str] = Field(default_factory=list)
    nationality: str | None = None
    budget_inr_per_year: int | None = None
    test_scores: TestScores = Field(default_factory=TestScores)
    notes: str | None = None
    chaos: dict[str, bool] = Field(default_factory=dict)
