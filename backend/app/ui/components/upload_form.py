"""Launch form: uploads, links, preferences and sample loading."""

from __future__ import annotations

import json
from pathlib import Path
from uuid import uuid4

from nicegui import ui

from app.config import BACKEND_DIR, settings
from app.models.inputs import RunForm
from app.models.profile import TestScores

MAX_UPLOAD_BYTES = 10 * 1024 * 1024
SAMPLES_DIR = BACKEND_DIR / "samples"
DEGREES = ["MS", "MEng", "MBA", "PhD", "MA", "Other"]
COUNTRIES = [
    "Canada",
    "Germany",
    "Singapore",
    "United States",
    "United Kingdom",
    "Australia",
    "Netherlands",
    "Sweden",
    "Switzerland",
    "Japan",
    "South Korea",
    "Ireland",
    "New Zealand",
    "France",
]
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


class UploadForm:
    def __init__(self) -> None:
        self.resume_bytes: bytes | None = None
        self.transcript_bytes: bytes | None = None

        samples = sorted(folder.name for folder in SAMPLES_DIR.iterdir() if folder.is_dir()) if SAMPLES_DIR.exists() else []
        with ui.card().classes("w-full"):
            ui.label("Student profile").classes("text-lg font-semibold")
            self.sample = ui.select(
                samples,
                label="Load a sample profile (optional)",
                on_change=self._load_sample,
            ).classes("w-full")

            with ui.row().classes("w-full gap-4"):
                with ui.column().classes("flex-1 gap-1"):
                    ui.label("Resume (PDF, required)").classes("text-sm font-medium")
                    ui.upload(
                        auto_upload=True,
                        max_file_size=MAX_UPLOAD_BYTES,
                        on_upload=self._on_resume,
                    ).props("accept=.pdf").classes("w-full")
                    self.resume_label = ui.label("No file uploaded").classes("text-xs text-gray-500")
                with ui.column().classes("flex-1 gap-1"):
                    ui.label("Transcript (PDF, optional)").classes("text-sm font-medium")
                    ui.upload(
                        auto_upload=True,
                        max_file_size=MAX_UPLOAD_BYTES,
                        on_upload=self._on_transcript,
                    ).props("accept=.pdf").classes("w-full")
                    self.transcript_label = ui.label("No file uploaded").classes("text-xs text-gray-500")

            with ui.row().classes("w-full gap-4"):
                self.github = ui.input("GitHub URL", placeholder="https://github.com/username").classes("flex-1")
                self.linkedin = ui.input("LinkedIn or portfolio URL").classes("flex-1")
            self.other = ui.input(
                "Other links (comma separated)", placeholder="https://..."
            ).classes("w-full")

            with ui.row().classes("w-full gap-4"):
                self.countries = ui.select(
                    COUNTRIES,
                    label="Target countries",
                    multiple=True,
                    new_value_mode="add-unique",
                    with_input=True,
                ).classes("flex-1")
                self.degree = ui.select(DEGREES, label="Target degree").classes("flex-1")
            self.fields = ui.select(
                FIELDS,
                label="Target fields",
                multiple=True,
                new_value_mode="add-unique",
                with_input=True,
            ).classes("w-full")

            with ui.row().classes("w-full gap-4"):
                self.nationality = ui.input("Nationality").classes("flex-1")
                self.budget = ui.number(
                    "Budget per year (INR)", min=0, step=100000, value=None
                ).classes("flex-1")

            ui.label("Test scores (leave blank if not taken)").classes("text-sm font-medium")
            with ui.row().classes("w-full gap-4"):
                self.ielts = ui.number("IELTS", min=0, max=9, step=0.5, value=None).classes("flex-1")
                self.toefl = ui.number("TOEFL", min=0, max=120, step=1, value=None).classes("flex-1")
                self.gre = ui.number("GRE", min=0, max=340, step=1, value=None).classes("flex-1")

            self.notes = ui.textarea(
                "Anything else the agents should know?", placeholder="Constraints, preferences, gaps..."
            ).classes("w-full")

    async def _on_resume(self, event) -> None:
        content = await event.file.read()
        if len(content) > MAX_UPLOAD_BYTES:
            ui.notify("Resume is larger than 10 MB", type="negative")
            return
        self.resume_bytes = content
        self.resume_label.text = f"{event.file.filename} ({len(content) / 1024:.0f} KB)"

    async def _on_transcript(self, event) -> None:
        content = await event.file.read()
        if len(content) > MAX_UPLOAD_BYTES:
            ui.notify("Transcript is larger than 10 MB", type="negative")
            return
        self.transcript_bytes = content
        self.transcript_label.text = f"{event.file.filename} ({len(content) / 1024:.0f} KB)"

    def _load_sample(self, event) -> None:
        name = event.value
        if not name:
            return
        form_path = SAMPLES_DIR / name / "form.json"
        if not form_path.exists():
            ui.notify(f"No form.json in sample {name}", type="warning")
            return
        data = json.loads(form_path.read_text())
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
        ui.notify(f"Loaded sample: {name}", type="positive")

    def to_form(self) -> RunForm:
        other = [item.strip() for item in (self.other.value or "").replace("\n", ",").split(",")]
        return RunForm(
            sample=self.sample.value or None,
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
        )

    def save_attachments(self) -> tuple[Path | None, Path | None]:
        if self.resume_bytes is None and self.transcript_bytes is None:
            return None, None
        folder = Path(settings.data_dir) / "uploads" / "pending" / uuid4().hex
        folder.mkdir(parents=True, exist_ok=True)
        resume_path = None
        transcript_path = None
        if self.resume_bytes is not None:
            resume_path = folder / "resume.pdf"
            resume_path.write_bytes(self.resume_bytes)
        if self.transcript_bytes is not None:
            transcript_path = folder / "transcript.pdf"
            transcript_path.write_bytes(self.transcript_bytes)
        return resume_path, transcript_path
