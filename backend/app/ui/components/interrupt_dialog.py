"""Human-in-the-loop dialog shown when the Clarifier interrupts the graph."""

from __future__ import annotations

from nicegui import ui

from app.services.runner import resume_run
from app.ui.live_state import RunView


class InterruptDialog:
    def __init__(self, run_id: str) -> None:
        self.run_id = run_id
        self.dialog = ui.dialog()
        self._payload: dict | None = None
        self._is_open = False
        self.inputs: dict[str, object] = {}

    def _widget(self, question: dict):
        kind = question.get("type", "text")
        label = question.get("question", question.get("field", "Answer"))
        if kind == "multi":
            return ui.select(
                options=[],
                label=label,
                multiple=True,
                with_input=True,
                new_value_mode="add-unique",
            ).classes("w-full")
        if kind == "number":
            return ui.number(label=label).classes("w-full")
        return ui.input(label=label).classes("w-full")

    def update(self, view: RunView) -> None:
        payload = view.interrupt
        if not payload:
            self._is_open = False
            return
        if self._is_open and payload == self._payload:
            return
        self._payload = payload
        self.inputs = {}
        self.dialog.clear()
        with self.dialog, ui.card().classes("w-[560px] max-w-full"):
            ui.label("The swarm needs one more detail").classes("text-lg font-semibold")
            ui.label("Answers are optional; skip and the agents continue with what they know.").classes(
                "text-sm text-gray-500"
            )
            for question in payload.get("questions", []):
                field = question.get("field") or question.get("question") or "answer"
                widget = self._widget(question)
                if question.get("default") is not None:
                    widget.value = question["default"]
                self.inputs[field] = widget
            with ui.row().classes("w-full justify-end"):
                ui.button("Skip", on_click=self._skip).props("flat")
                ui.button("Continue", on_click=self._submit).props("color=primary")
        self._is_open = True
        self.dialog.open()

    async def _submit(self) -> None:
        answers = {
            field: widget.value
            for field, widget in self.inputs.items()
            if widget.value not in (None, "", [])
        }
        await resume_run(self.run_id, answers)
        self.dialog.close()
        self._is_open = False

    async def _skip(self) -> None:
        await resume_run(self.run_id, {})
        self.dialog.close()
        self._is_open = False
