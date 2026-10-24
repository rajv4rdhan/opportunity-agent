"""Launch page: provider health, upload form, chaos switches, launch button."""

from __future__ import annotations

from nicegui import ui

from app.config import PROVIDERS, settings
from app.services import runner
from app.tools.github import resolve_token
from app.ui.components.chaos_panel import ChaosPanel
from app.ui.components.upload_form import UploadForm
from app.ui.theme import frame


def _provider_row() -> None:
    with ui.row().classes("flex-wrap gap-4 items-center"):
        for name in PROVIDERS:
            configured = bool(resolve_token()) if name == "github" else settings.configured(name)
            with ui.row().classes("items-center gap-1"):
                ui.element("div").classes(
                    f"w-2.5 h-2.5 rounded-full {'bg-green-500' if configured else 'bg-gray-300'}"
                )
                ui.label(name).classes("text-xs uppercase tracking-wide text-gray-500")


@ui.page("/")
def home() -> None:
    with frame("New search"):
        ui.label("ScholarSwarm — AI agents that find your funding").classes("text-3xl font-bold")
        ui.label(
            "Upload a resume and transcript, launch the swarm, and watch it verify real "
            "scholarships and programs with sources."
        ).classes("text-base text-gray-500")
        ui.label("Providers").classes("text-xs font-semibold uppercase opacity-60")
        _provider_row()

        form = UploadForm()
        chaos = ChaosPanel()

        async def launch() -> None:
            if form.resume_bytes is None and not form.sample.value:
                ui.notify("Upload a resume PDF or load a sample profile.", type="warning")
                return
            run_form = form.to_form()
            run_form.chaos = chaos.values()
            resume_path, transcript_path = form.save_attachments()
            try:
                run_id = await runner.create_run(run_form, resume_path, transcript_path)
            except Exception as error:  # noqa: BLE001 - shown to the user
                ui.notify(str(error), type="negative")
                return
            ui.navigate.to(f"/runs/{run_id}")

        ui.button("Launch Agents", icon="rocket_launch", on_click=launch).props(
            "size=lg color=primary"
        ).classes("mt-2")
