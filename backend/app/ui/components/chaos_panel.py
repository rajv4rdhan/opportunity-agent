"""Chaos Mode switches: each injects one visible, one-shot failure."""

from __future__ import annotations

from nicegui import ui

from app.core.chaos import CHAOS_DESCRIPTIONS, CHAOS_POINTS


class ChaosPanel:
    def __init__(self) -> None:
        with ui.expansion("Chaos Mode", icon="bolt").classes("w-full"):
            ui.label(
                "Inject a failure once per run and watch the fallback recover. "
                "The run still finishes."
            ).classes("text-sm text-gray-500")
            self.switches = {}
            for flag in CHAOS_POINTS:
                with ui.row().classes("items-center justify-between w-full"):
                    ui.label(flag.replace("_", " ").title())
                    self.switches[flag] = ui.switch(value=False).tooltip(CHAOS_DESCRIPTIONS[flag])

    def values(self) -> dict[str, bool]:
        return {flag: bool(widget.value) for flag, widget in self.switches.items()}
