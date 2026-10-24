"""Run statistics chips."""

from __future__ import annotations

from nicegui import ui

from app.models.report import RunStats
from app.ui.live_state import RunView


class RunStatsBar:
    def __init__(self) -> None:
        self.row = ui.row().classes("flex-wrap gap-2 items-center")
        self.update(None)

    def update(self, view: RunView | None) -> None:
        stats = view.stats if view else RunStats()
        elapsed = f"{stats.duration_sec:.0f}s"
        self.row.clear()
        with self.row:
            for icon, label, value in (
                ("smart_toy", "LLM", stats.llm_calls),
                ("build", "tools", stats.tool_calls),
                ("menu_book", "pages", stats.pages_read),
                ("replay", "retries", stats.retries),
                ("swap_horiz", "fallbacks", stats.fallbacks),
                ("error", "errors", stats.errors),
                ("payments", "cost", f"${stats.est_cost_usd:.3f}"),
                ("timer", "elapsed", elapsed),
            ):
                ui.chip(f"{label}: {value}", icon=icon).props("outline dense")
