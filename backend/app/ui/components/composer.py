"""The intake composer: files, typed text, speech, hints and one submit button."""

from __future__ import annotations

import asyncio
import tempfile
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from pathlib import Path

from nicegui import ui

from app.services.intake import classify_document, coverage, word_count
from app.tools.pdf import extract_text
from app.ui.components.voice_input import VoiceInput

MAX_UPLOAD_BYTES = 10 * 1024 * 1024
HINTS = [
    ("degree", "Degree"),
    ("grades", "Grades"),
    ("goal", "Goal"),
    ("countries", "Countries"),
    ("budget", "Budget"),
    ("tests", "Tests"),
    ("projects", "Projects"),
]
PLACEHOLDER = (
    "Tell us about yourself — your degree, grades, projects, and what you want to study "
    "and where. Or just drop your resume here."
)


@dataclass
class Attachment:
    content: bytes
    filename: str
    role: str = "resume"


@dataclass
class ComposerValue:
    description: str | None
    files: list[tuple[bytes, str]] = field(default_factory=list)
    modes: list[str] = field(default_factory=list)


def _detect_role(content: bytes) -> str:
    try:
        with tempfile.NamedTemporaryFile(suffix=".pdf") as handle:
            handle.write(content)
            handle.flush()
            return classify_document(extract_text(Path(handle.name)))
    except Exception:  # noqa: BLE001 - keep the first role when the PDF cannot be read
        return "resume"


class Composer:
    def __init__(self, on_submit: Callable[[ComposerValue], Awaitable[None] | None]) -> None:
        self.on_submit = on_submit
        self._files: list[Attachment] = []
        self._used_voice = False
        self._last_text = ""
        self._submitting = False
        self.sample_id: str | None = None

        with ui.card().classes("ss-card ss-composer w-full"):
            self.upload = (
                ui.upload(
                    multiple=True,
                    max_files=2,
                    max_file_size=MAX_UPLOAD_BYTES,
                    auto_upload=True,
                    on_upload=self._on_upload,
                    on_rejected=self._on_rejected,
                )
                .props("accept=.pdf multiple max-files=2 auto-upload")
                .style("display: none")
            )
            self.dropzone = (
                ui.label("Drop a resume or transcript here, or click to attach a PDF")
                .classes("ss-dropzone")
                .on("click", self._pick_files)
            )
            self.attachments = ui.row().classes("w-full flex-wrap gap-2")
            self.text = (
                ui.textarea(placeholder=PLACEHOLDER)
                .props("autogrow borderless")
                .classes("ss-composer-text")
            )
            self.live = ui.label("").classes("ss-live-text")
            self.text.on("keydown.ctrl.enter", self.submit)
            self.text.on("keydown.meta.enter", self.submit)

            with ui.row().classes("ss-composer-toolbar flex-wrap"):
                with ui.row().classes("items-center gap-2"):
                    ui.button("Attach", icon="attach_file", on_click=self._pick_files).props(
                        "flat dense no-caps"
                    )
                    self.voice = VoiceInput(
                        self.text, on_transcript=self._mark_voice, status_target=self.live
                    )
                    self.counter = ui.label("0 words").classes("ss-small")
                with ui.row().classes("items-center gap-3"):
                    self.helper = ui.label("").classes("ss-small")
                    self.submit_button = (
                        ui.button("Find scholarships", icon="arrow_forward", on_click=self.submit)
                        .props("color=primary unelevated no-caps")
                    )

        self.hints = ui.row().classes("flex-wrap items-center gap-1 w-full")

        self._render_attachments()
        self._refresh_hints(force=True)
        ui.timer(0.3, self._refresh_hints)

    def _pick_files(self) -> None:
        self.upload.run_method("pickFiles")

    def _mark_voice(self) -> None:
        self._used_voice = True
        self._refresh_validity()

    def _on_rejected(self, _event=None) -> None:
        ui.notify("Only PDFs up to 10 MB are accepted (maximum 2 files).", type="warning")

    async def _on_upload(self, event) -> None:
        content = await event.file.read()
        if len(content) > MAX_UPLOAD_BYTES:
            ui.notify("That file is larger than 10 MB.", type="negative")
            return
        if len(self._files) >= 2:
            ui.notify("You can attach at most two PDFs.", type="warning")
            return
        filename = getattr(event.file, "name", None) or getattr(
            event.file, "filename", "upload.pdf"
        )
        role = _detect_role(content)
        self._files.append(Attachment(content=content, filename=filename, role=role))
        self.upload.reset()
        self._render_attachments()
        self._refresh_hints(force=True)
        self._refresh_validity()

    def _render_attachments(self) -> None:
        self.attachments.clear()
        self.dropzone.set_visibility(not self._files)
        with self.attachments:
            for index, attachment in enumerate(self._files):
                with ui.row().classes("ss-attachment no-wrap"):
                    ui.icon("description", size="14px")
                    ui.label(attachment.filename).classes("text-xs truncate max-w-[150px]")
                    role = (
                        ui.label(attachment.role.title())
                        .classes("ss-attachment-role cursor-pointer")
                        .tooltip("Click to switch resume / transcript")
                    )
                    role.on("click", lambda _, position=index: self._swap_role(position))
                    ui.button(icon="close", on_click=lambda _, position=index: self._remove(position)).props(
                        "flat round dense size=xs"
                    )

    def _swap_role(self, index: int) -> None:
        attachment = self._files[index]
        attachment.role = "transcript" if attachment.role == "resume" else "resume"
        self._render_attachments()

    def _remove(self, index: int) -> None:
        if 0 <= index < len(self._files):
            self._files.pop(index)
            self._render_attachments()
            self._refresh_hints(force=True)
            self._refresh_validity()

    def _refresh_hints(self, force: bool = False) -> None:
        text = self.text.value or ""
        if not force and text == self._last_text:
            return
        self._last_text = text
        self.counter.text = f"{word_count(text)} words"
        covered = coverage(text)
        self.hints.clear()
        with self.hints:
            for key, label in HINTS:
                if self._files:
                    ui.label(f"{label} · from resume").classes("ss-hint is-document")
                elif covered.get(key):
                    ui.label(f"✓ {label}").classes("ss-hint is-covered")
                else:
                    ui.label(label).classes("ss-hint")
        self._refresh_validity()

    def _refresh_validity(self) -> None:
        valid = self.is_valid()
        self.submit_button.set_enabled(valid)
        if valid:
            self.helper.text = ""
        else:
            self.helper.text = "Add a resume or a few sentences about you."

    def is_valid(self) -> bool:
        return bool(self._files or self.sample_id or word_count(self.text.value) >= 20)

    def set_sample(self, name: str | None) -> None:
        self.sample_id = name
        self._refresh_validity()

    def value(self) -> ComposerValue:
        description = (self.text.value or "").strip() or None
        modes: list[str] = []
        if self._files:
            modes.append("resume")
        if description:
            modes.append("text")
        if self._used_voice:
            modes.append("voice")
        return ComposerValue(
            description=description,
            files=[(attachment.content, attachment.filename) for attachment in self._files],
            modes=modes,
        )

    async def submit(self, _event=None) -> None:
        if self._submitting or not self.is_valid():
            return
        self._submitting = True
        try:
            result = self.on_submit(self.value())
            if asyncio.iscoroutine(result):
                await result
        finally:
            self._submitting = False
