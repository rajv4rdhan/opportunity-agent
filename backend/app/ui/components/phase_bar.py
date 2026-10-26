"""Six-phase progress stepper with elapsed time and a median-duration ETA."""

from __future__ import annotations

from nicegui import ui

from app.ui.agents import PHASES
from app.ui.live_state import RunView


def _clock(seconds: float) -> str:
    total = max(0, int(seconds))
    return f"{total // 60:02d}:{total % 60:02d}"


class PhaseBar:
    def __init__(self, median_duration_sec: float | None = None) -> None:
        self.median = median_duration_sec
        self._signature: tuple | None = None
        with ui.row().classes("w-full items-center gap-3 flex-wrap") as self.row:
            self.mobile = ui.label("").classes("ss-small ss-mobile-only")
            self.steps = ui.row().classes("items-center gap-1 flex-wrap flex-1 ss-desktop-only")
            with ui.row().classes("items-center gap-3 ml-auto"):
                self.elapsed = ui.label("00:00").classes("ss-small ss-mono")
                self.eta = ui.label("").classes("ss-small")

    def _elapsed_seconds(self, view: RunView) -> float:
        if view.finished and view.stats.duration_sec:
            return float(view.stats.duration_sec)
        if view.started_at is None:
            return 0.0
        if view.events:
            return max(0.0, (view.events[-1].ts - view.started_at).total_seconds())
        return 0.0

    def _eta_text(self, view: RunView, elapsed: float) -> str:
        if view.finished:
            return ""
        if not self.median:
            return ""
        remaining = self.median - elapsed
        if remaining <= 45:
            return "almost done"
        return f"~{max(1, round(remaining / 60))} min left"

    def update(self, view: RunView) -> None:
        signature = (view.phase, tuple(sorted(view.phase_done)), view.finished, self.median)
        if signature != self._signature:
            self._signature = signature
            self.steps.clear()
            active_index = next(
                (index for index, phase in enumerate(PHASES) if phase["id"] == view.phase),
                0,
            )
            with self.steps:
                for index, phase in enumerate(PHASES):
                    if view.finished or phase["id"] in view.phase_done:
                        modifier = "is-done"
                        icon = "check"
                    elif phase["id"] == view.phase:
                        modifier = "is-running"
                        icon = "radio_button_checked"
                    else:
                        modifier = "is-idle"
                        icon = "circle"
                    with ui.row().classes(f"ss-pill {modifier} gap-1"):
                        ui.icon(icon, size="12px")
                        ui.label(phase["label"])
                    if index < len(PHASES) - 1:
                        ui.icon("chevron_right", size="14px").classes("ss-muted")
            if view.finished:
                self.mobile.text = "All six phases complete"
            else:
                self.mobile.text = (
                    f"{PHASES[active_index]['label']} · step {active_index + 1} of {len(PHASES)}"
                )

        elapsed_seconds = self._elapsed_seconds(view)
        self.elapsed.text = _clock(elapsed_seconds)
        self.eta.text = self._eta_text(view, elapsed_seconds)
