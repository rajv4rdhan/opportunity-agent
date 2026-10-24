"""Event shapes shared by the store, the SSE endpoint and the UI."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

EventType = Literal[
    "run_started",
    "run_finished",
    "run_failed",
    "agent_started",
    "agent_finished",
    "agent_failed",
    "agent_skipped",
    "log",
    "tool_call",
    "tool_result",
    "tool_error",
    "retry",
    "fallback",
    "decision",
    "interrupt",
    "resumed",
    "browser_live_view",
    "graph_update",
    "candidate_found",
    "opportunity_verified",
    "opportunity_rejected",
    "chaos_injected",
]


class Event(BaseModel):
    id: int | None = None
    run_id: str
    ts: datetime
    type: EventType
    agent: str | None = None
    message: str
    data: dict = Field(default_factory=dict)
