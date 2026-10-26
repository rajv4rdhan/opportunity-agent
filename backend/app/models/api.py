"""Stable API response shapes for the React frontend."""

from __future__ import annotations

from pydantic import BaseModel, Field

from app.models.report import FinalReport


class RunSummary(BaseModel):
    id: str
    created_at: str
    status: str
    student_name: str | None = None
    duration_sec: float | None = None
    verified_count: int | None = None


class RunDetail(BaseModel):
    id: str
    created_at: str
    status: str
    student_name: str | None = None
    error: str | None = None
    report: FinalReport | None = None
    pending_questions: dict | None = None


class SampleInfo(BaseModel):
    name: str
    label: str
    description: str
    form: dict = Field(default_factory=dict)


class ChaosPoint(BaseModel):
    key: str
    label: str
    caption: str


class MetaResponse(BaseModel):
    providers: dict[str, bool] = Field(default_factory=dict)
    samples: list[SampleInfo] = Field(default_factory=list)
    chaos_points: list[ChaosPoint] = Field(default_factory=list)
    median_duration_sec: float | None = None
