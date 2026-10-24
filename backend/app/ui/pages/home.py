"""Home page — Phase 1 placeholder; the launch form arrives in Phase 7."""

from __future__ import annotations

from nicegui import ui

from app.ui.theme import frame


@ui.page("/")
def home() -> None:
    with frame("New search"):
        ui.label("ScholarSwarm — AI agents that find your funding").classes("text-3xl font-bold")
        ui.label(
            "Upload a resume and transcript, launch the swarm, and watch it verify "
            "real scholarships with sources."
        ).classes("text-base text-gray-500")
        ui.separator()
        ui.label("Phase 1 placeholder page. The launch form will replace this in Phase 7.").classes(
            "text-sm text-gray-400"
        )
