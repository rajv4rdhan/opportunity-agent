"""Scrolling event feed with an agent filter."""

from __future__ import annotations

from nicegui import ui

from app.models.events import Event
from app.ui.agents import AGENTS, EVENT_STYLE
from app.ui.live_state import RunView


class EventFeed:
    def __init__(self) -> None:
        options = {"All": "All", **{agent["id"]: agent["label"] for agent in AGENTS}, "run": "run"}
        with ui.row().classes("w-full items-center justify-between"):
            ui.label("Event feed").classes("font-semibold")
            self.filter = ui.select(options, value="All", on_change=self._rebuild).classes("w-48")
        self.scroll = ui.scroll_area().classes("w-full border rounded p-2").style("height: 400px")
        self._view: RunView | None = None
        self._last_id = 0

    def _match(self, event: Event) -> bool:
        selected = self.filter.value
        return selected == "All" or (event.agent or "run") == selected

    def _row(self, event: Event) -> None:
        icon, color = EVENT_STYLE.get(event.type, ("circle", "grey"))
        with ui.row().classes("w-full items-start gap-2 no-wrap"):
            ui.icon(icon, color=color, size="18px").classes("mt-1")
            with ui.column().classes("gap-0 flex-1"):
                with ui.row().classes("items-center gap-2"):
                    ui.label((event.agent or "run").replace("_", " ")).classes("text-xs font-semibold")
                    ui.label(event.type.replace("_", " ")).classes("text-[10px] uppercase opacity-60")
                ui.label(event.message).classes("text-sm whitespace-pre-wrap break-words")
                url = (event.data or {}).get("url")
                if url:
                    ui.link(str(url), str(url), new_tab=True).classes("text-xs")

    def _rebuild(self) -> None:
        self.scroll.clear()
        self._last_id = 0
        if self._view is None:
            return
        with self.scroll:
            for event in self._view.events:
                if self._match(event):
                    self._row(event)
        if self._view.events:
            self._last_id = self._view.events[-1].id or 0

    def update(self, view: RunView) -> None:
        self._view = view
        new_events = [event for event in view.events if (event.id or 0) > self._last_id]
        if not new_events:
            return
        with self.scroll:
            for event in new_events:
                if self._match(event):
                    self._row(event)
        self._last_id = max(event.id or 0 for event in new_events)
        self.scroll.scroll_to(percent=100)
