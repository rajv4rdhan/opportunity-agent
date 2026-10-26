"""Optional details and demo controls under the intake composer."""

from __future__ import annotations

import json
from collections.abc import Callable
from pathlib import Path
from uuid import uuid4

from nicegui import ui

from app.config import BACKEND_DIR, PROVIDERS, settings
from app.core.chaos import CHAOS_DESCRIPTIONS, CHAOS_POINTS
from app.models.inputs import RunForm
from app.models.profile import TestScores
from app.services.intake import COUNTRIES
from app.tools.github import resolve_token

SAMPLES_DIR = BACKEND_DIR / "samples"
DEGREES = ["MS", "MEng", "MBA", "PhD", "MA", "Other"]
FIELDS = [
    "Computer Science",
    "Artificial Intelligence",
    "Data Science",
    "Bioinformatics",
    "Biotechnology",
    "Business Administration",
    "Robotics",
    "Electrical Engineering",
    "Mechanical Engineering",
    "Public Health",
    "Economics",
]
MAX_UPLOAD_BYTES = 10 * 1024 * 1024


def save_attachments(files: list[tuple[bytes, str]]) -> tuple[Path | None, Path | None]:
    """Persist uploaded PDFs under data/uploads/pending for the runner."""
    if not files:
        return None, None
    folder = Path(settings.data_dir) / "uploads" / "pending" / uuid4().hex
    folder.mkdir(parents=True, exist_ok=True)
    paths: list[Path] = []
    for index, (content, _filename) in enumerate(files[:2], start=1):
        path = folder / f"upload-{index}.pdf"
        path.write_bytes(content)
        paths.append(path)
    return (paths[0] if paths else None, paths[1] if len(paths) > 1 else None)


class AdvancedOptions:
    def __init__(self, on_sample: Callable[[str], None] | None = None) -> None:
        self.on_sample = on_sample
        self.sample_id: str | None = None
        samples = (
            sorted(folder.name for folder in SAMPLES_DIR.iterdir() if folder.is_dir())
            if SAMPLES_DIR.exists()
            else []
        )

        with ui.column().classes("w-full gap-1"):
            with ui.expansion("Add details", icon="tune").classes("w-full"):
                with ui.column().classes("w-full gap-3 pt-2"):
                    with ui.row().classes("w-full gap-3"):
                        self.github = ui.input(
                            "GitHub URL", placeholder="https://github.com/username"
                        ).classes("flex-1")
                        self.linkedin = ui.input("LinkedIn or portfolio").classes("flex-1")
                    self.other = ui.input(
                        "Other links", placeholder="Comma-separated URLs"
                    ).classes("w-full")
                    with ui.row().classes("w-full gap-3"):
                        self.countries = (
                            ui.select(
                                COUNTRIES,
                                label="Target countries",
                                multiple=True,
                                new_value_mode="add-unique",
                                with_input=True,
                            )
                            .props("use-chips")
                            .classes("flex-1")
                        )
                        self.degree = ui.select(DEGREES, label="Target degree").classes("flex-1")
                    self.fields = (
                        ui.select(
                            FIELDS,
                            label="Target fields",
                            multiple=True,
                            new_value_mode="add-unique",
                            with_input=True,
                        )
                        .props("use-chips")
                        .classes("w-full")
                    )
                    with ui.row().classes("w-full gap-3"):
                        self.nationality = ui.input("Nationality").classes("flex-1")
                        self.budget = ui.number(
                            "Budget per year (INR)", min=0, step=100000, value=None
                        ).classes("flex-1")
                    ui.label("Test scores").classes("ss-small")
                    with ui.row().classes("w-full gap-3"):
                        self.ielts = ui.number(
                            "IELTS", min=0, max=9, step=0.5, value=None
                        ).classes("flex-1")
                        self.toefl = ui.number(
                            "TOEFL", min=0, max=120, step=1, value=None
                        ).classes("flex-1")
                        self.gre = ui.number(
                            "GRE", min=0, max=340, step=1, value=None
                        ).classes("flex-1")
                    self.notes = ui.input(
                        "Anything else?", placeholder="Constraints or preferences"
                    ).classes("w-full")

            with ui.expansion("Demo controls", icon="science").classes("w-full"):
                with ui.column().classes("w-full gap-3 pt-2"):
                    ui.label("Sample profiles").classes("ss-small")
                    with ui.row().classes("flex-wrap gap-1"):
                        for name in samples:
                            ui.button(
                                name.title(),
                                on_click=lambda _, sample=name: self.load_sample(sample),
                            ).props("flat dense no-caps").classes("ss-chip")
                    ui.label("Chaos Mode").classes("ss-small")
                    ui.label(
                        "Inject a failure once per run and watch the amber recovery. "
                        "The run still finishes."
                    ).classes("ss-small")
                    self.switches = {}
                    for flag in CHAOS_POINTS:
                        with ui.row().classes("w-full items-center justify-between"):
                            ui.label(flag.replace("_", " ").title()).classes("text-sm")
                            self.switches[flag] = ui.switch(value=False).tooltip(
                                CHAOS_DESCRIPTIONS[flag]
                            )
                    self._provider_row()

    def _provider_row(self) -> None:
        with ui.row().classes("flex-wrap gap-3 items-center pt-1"):
            for name in PROVIDERS:
                configured = bool(resolve_token()) if name == "github" else settings.configured(name)
                ui.label(f"{name} {'ready' if configured else 'not set'}").classes(
                    f"ss-small {'text-emerald-600' if configured else ''}"
                )

    def load_sample(self, name: str) -> None:
        form_path = SAMPLES_DIR / name / "form.json"
        if not form_path.exists():
            ui.notify(f"No form.json in sample {name}", type="warning")
            return
        data = json.loads(form_path.read_text())
        self.sample_id = name
        self.github.value = data.get("github_url") or ""
        self.linkedin.value = data.get("linkedin_url") or ""
        self.other.value = ", ".join(data.get("other_links") or [])
        self.countries.value = list(data.get("target_countries") or [])
        self.degree.value = data.get("target_degree")
        self.fields.value = list(data.get("target_fields") or [])
        self.nationality.value = data.get("nationality") or ""
        self.budget.value = data.get("budget_inr_per_year")
        scores = data.get("test_scores") or {}
        self.ielts.value = scores.get("ielts")
        self.toefl.value = scores.get("toefl")
        self.gre.value = scores.get("gre")
        self.notes.value = data.get("notes") or ""
        if self.on_sample:
            self.on_sample(name)
        ui.notify(f"Loaded sample: {name}", type="positive")

    def values(self) -> dict[str, bool]:
        return {flag: bool(widget.value) for flag, widget in self.switches.items()}

    def to_form(self, description: str | None, modes: list[str]) -> RunForm:
        other = [item.strip() for item in (self.other.value or "").replace("\n", ",").split(",")]
        return RunForm(
            sample=self.sample_id,
            description=description,
            input_modes=modes,
            github_url=self.github.value or None,
            linkedin_url=self.linkedin.value or None,
            other_links=[item for item in other if item],
            target_countries=list(self.countries.value or []),
            target_degree=self.degree.value or None,
            target_fields=list(self.fields.value or []),
            nationality=self.nationality.value or None,
            budget_inr_per_year=int(self.budget.value) if self.budget.value else None,
            test_scores=TestScores(
                ielts=self.ielts.value,
                toefl=self.toefl.value,
                gre=self.gre.value,
            ),
            notes=self.notes.value or None,
            chaos=self.values(),
        )
