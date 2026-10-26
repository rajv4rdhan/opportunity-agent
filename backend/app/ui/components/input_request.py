"""Inline, voice-enabled clarifier card shown when the graph asks for input."""

from __future__ import annotations

import json

from nicegui import ui

from app.services.intake import COUNTRIES
from app.services.runner import resume_run
from app.ui.components.voice_input import VoiceInput
from app.ui.live_state import RunView


class InputRequest:
    def __init__(self, run_id: str) -> None:
        self.run_id = run_id
        self._payload: dict | None = None
        self._awaiting_resume = False
        self.inputs: dict[str, object] = {}
        self.container = ui.column().classes("w-full")
        self.container.props("id=input-request")
        self.container.set_visibility(False)

    def _widget(self, question: dict):
        kind = question.get("type", "text")
        label = question.get("question", question.get("field", "Answer"))
        field = str(question.get("field") or "")
        if kind == "multi":
            options = COUNTRIES if "countr" in field.lower() or "countr" in label.lower() else []
            return (
                ui.select(
                    options,
                    label=label,
                    multiple=True,
                    with_input=True,
                    new_value_mode="add-unique",
                )
                .props("use-chips")
                .classes("w-full")
            )
        if kind == "number":
            return ui.number(label=label).classes("w-full")
        return ui.input(label=label).classes("w-full")

    def update(self, view: RunView) -> None:
        payload = view.interrupt
        if not payload:
            self._awaiting_resume = False
            self._payload = None
            self.container.clear()
            self.container.set_visibility(False)
            return
        if self._awaiting_resume and payload == self._payload:
            return
        if payload == self._payload and self.container.visible:
            return

        self._payload = payload
        self.inputs = {}
        self.container.clear()
        self.container.set_visibility(True)
        with self.container:
            with ui.element("div").classes("ss-card w-full ss-fade-in").style(
                "border-color: var(--accent); background: var(--accent-soft);"
            ):
                ui.label("The swarm needs one detail").classes("ss-h2")
                ui.label(
                    "Answer here and the run continues. Answers are optional; skip and the agents "
                    "will use what they know."
                ).classes("ss-small")
                for question in payload.get("questions", []):
                    field = str(question.get("field") or question.get("question") or "answer")
                    widget = self._widget(question)
                    if question.get("default") is not None:
                        widget.value = question["default"]
                    self.inputs[field] = widget
                    if question.get("type", "text") == "text":
                        VoiceInput(widget, lang_select=False)
                with ui.row().classes("w-full justify-end gap-2 mt-2"):
                    ui.button("Skip", on_click=self._skip).props("flat no-caps")
                    ui.button("Continue", on_click=self._submit).props(
                        "color=primary unelevated no-caps"
                    )
        async def scroll_to_card() -> None:
            await ui.run_javascript(
                "document.getElementById('input-request')?.scrollIntoView({behavior:'smooth', block:'center'})"
            )

        ui.timer(0.15, scroll_to_card, once=True)

    async def _resume(self, answers: dict) -> None:
        self._awaiting_resume = True
        try:
            await resume_run(self.run_id, answers)
        except Exception as error:  # noqa: BLE001 - show the failure instead of looping
            self._awaiting_resume = False
            ui.notify(f"Could not resume the run: {error}", type="negative")

    async def _submit(self) -> None:
        answers = {
            field: widget.value
            for field, widget in self.inputs.items()
            if widget.value not in (None, "", [])
        }
        await self._resume(answers)

    async def _skip(self) -> None:
        await self._resume({})
