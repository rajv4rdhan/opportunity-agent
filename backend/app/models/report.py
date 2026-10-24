"""Final report shapes consumed by the API, the UI and the markdown export."""

from __future__ import annotations

from pydantic import BaseModel, Field

from app.models.opportunity import Gap, Opportunity, Rejection
from app.models.profile import GitHubInsights, StudentProfile


class TopMatch(BaseModel):
    rank: int
    opportunity: Opportunity
    why_it_fits: str = ""
    graph_paths: list[list[str]] = Field(default_factory=list)


class RunStats(BaseModel):
    agents_run: int = 0
    llm_calls: int = 0
    tool_calls: int = 0
    retries: int = 0
    fallbacks: int = 0
    errors: int = 0
    pages_read: int = 0
    duration_sec: float = 0
    est_cost_usd: float = 0


class FinalReport(BaseModel):
    run_id: str
    profile: StudentProfile
    github: GitHubInsights | None = None
    top5: list[TopMatch] = Field(default_factory=list)
    all_opportunities: list[Opportunity] = Field(default_factory=list)
    rejected: list[Rejection] = Field(default_factory=list)
    gaps: list[Gap] = Field(default_factory=list)
    sop_for: str | None = None
    sop_markdown: str | None = None
    critic_notes: list[str] = Field(default_factory=list)
    stats: RunStats = Field(default_factory=RunStats)
