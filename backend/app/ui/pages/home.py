"""Intake home: one composer for a resume, typed text or speech."""

from __future__ import annotations

import json

from nicegui import ui

from app.services import runner
from app.ui.components.advanced_options import SAMPLES_DIR, AdvancedOptions, save_attachments
from app.ui.components.composer import Composer, ComposerValue
from app.ui.theme import frame


def _sample_description(name: str, data: dict) -> str:
    degree = data.get("target_degree") or "a master's"
    fields = ", ".join(data.get("target_fields") or []) or "my field"
    countries = ", ".join(data.get("target_countries") or []) or "my target countries"
    budget = data.get("budget_inr_per_year")
    budget_text = f" My budget is about INR {budget:,} per year." if budget else ""
    return f"Sample profile: {name.title()}. I want {degree} in {fields} in {countries}.{budget_text}"


@ui.page("/")
def home() -> None:
    with frame("New search"):
        with ui.column().classes("w-full max-w-[760px] mx-auto gap-6 py-4"):
            with ui.column().classes("gap-2"):
                ui.label("AI scholarship research").classes("ss-eyebrow")
                ui.label("Find funding you actually qualify for.").classes("ss-h1")
                ui.label(
                    "Eleven AI agents read your profile, search official sources, verify every "
                    "requirement and draft your application."
                ).classes("ss-sub")

            async def launch(value: ComposerValue) -> None:
                form = advanced.to_form(value.description, value.modes)
                resume_path, transcript_path = save_attachments(value.files)
                try:
                    run_id = await runner.create_run(form, resume_path, transcript_path)
                except Exception as error:  # noqa: BLE001 - shown to the user
                    ui.notify(str(error), type="negative")
                    return
                ui.navigate.to(f"/runs/{run_id}")

            composer = Composer(launch)

            def apply_sample(name: str) -> None:
                form_path = SAMPLES_DIR / name / "form.json"
                data = json.loads(form_path.read_text()) if form_path.exists() else {}
                composer.text.value = _sample_description(name, data)
                composer.set_sample(name)
                composer._refresh_hints(force=True)

            advanced = AdvancedOptions(on_sample=apply_sample)

            with ui.row().classes("ss-trust"):
                for icon, text in (
                    ("verified", "Official sources only"),
                    ("format_quote", "Every fact cited"),
                    ("lock", "Your files stay in this session"),
                ):
                    with ui.row().classes("items-center gap-1"):
                        ui.icon(icon, size="14px")
                        ui.label(text)
