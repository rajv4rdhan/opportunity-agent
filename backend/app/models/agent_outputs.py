"""Structured LLM outputs used by individual agents."""

from __future__ import annotations

from pydantic import BaseModel, Field

from app.models.opportunity import Opportunity, ResearchTask


class PlannerOutput(BaseModel):
    tasks: list[ResearchTask] = Field(default_factory=list)
    strategy_note: str = ""


class VerifierOutput(BaseModel):
    is_relevant: bool
    reason: str = ""
    opportunity: Opportunity | None = None
    official_url: str | None = None


class WhyFit(BaseModel):
    why_it_fits: str


class CriticOutput(BaseModel):
    passed: bool
    issues: list[str] = Field(default_factory=list)
