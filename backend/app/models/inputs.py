"""User input shape shared by the REST API and the React intake form."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator

from app.models.profile import TestScores


class RunForm(BaseModel):
    sample: str | None = None
    description: str | None = Field(default=None, max_length=5000)
    input_modes: list[Literal["resume", "text", "voice"]] = Field(default_factory=list)
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

    @field_validator("description", mode="before")
    @classmethod
    def _clean_description(cls, value: object) -> str | None:
        if value is None:
            return None
        text = str(value).strip()
        return text or None

    @field_validator("input_modes")
    @classmethod
    def _unique_modes(cls, value: list[str]) -> list[str]:
        return list(dict.fromkeys(value))
