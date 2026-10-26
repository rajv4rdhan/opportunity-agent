"""Important-first activity feed with an agent filter."""

from __future__ import annotations

from nicegui import ui

from app.models.events import Event
from app.ui.agents import AGENT_BY_ID, AGENTS, EVENT_STYLE, IMPORTANT_EVENTS
from app.ui.live_state import RunView


class Activity:
    def __init__(self) -> None:
        self._view: RunView | None = None
        self._last_id = 0
        options = {"all": "All agents", **{agent["id"]: agent["label"] for agent in AGENTS}}
        with ui.row().classes("w-full items-center justify-between gap-2 flex-wrap"):
            ui.label("Activity").classes("ss-h2")
            with ui.row().classes("items-center gap-2"):
                self.mode = (
                    ui.toggle({"important": "Important", "all": "All"}, value="important")
                    .props("dense unelevated no-caps")
                    .on_value_change(self._rebuild)
                )
                self.agent_filter = (
                    ui.select(options, value="all")
                    .props("dense borderless options-dense")
                    .classes("w-36")
                    .on_value_change(self._rebuild)
                )
        self.scroll = ui.scroll_area().classes("w-full").style("height: 430px")

    def _match(self, event: Event) -> bool:
        if self.mode.value == "important" and event.type not in IMPORTANT_EVENTS:
            return False
        selected = self.agent_filter.value
        return selected == "all" or (event.agent or "run") == selected

    def _row(self, event: Event, view: RunView) -> None:
        icon, colour = EVENT_STYLE.get(event.type, ("circle", "muted"))
        modifier = {"warn": "is-warn", "err": "is-err", "accent": "is-accent"}.get(colour, "")
        with ui.row().classes(f"ss-activity-row {modifier} no-wrap w-full"):
            if view.started_at:
                seconds = max(0, int((event.ts - view.started_at).total_seconds()))
                ui.label(f"{seconds // 60:02d}:{seconds % 60:02d}").classes("ss-time")
            else:
                ui.label("00:00").classes("ss-time")
            ui.icon(icon, size="16px").style(f"color: var(--{colour})").classes("mt-0.5")
            with ui.column().classes("gap-0 flex-1 min-w-0"):
                with ui.row().classes("items-center gap-2 flex-wrap"):
                    agent = AGENT_BY_ID.get(event.agent or "", {}).get(
                        "label", (event.agent or "run").replace("_", " ").title()
                    )
                    ui.label(agent).classes("text-xs font-semibold")
                    ui.label(event.type.replace("_", " ")).classes(
                        "text-[10px] uppercase tracking-wide ss-muted"
                    )
                ui.label(event.message).classes("text-sm break-words whitespace-pre-wrap")
                url = (event.data or {}).get("url")
                if url:
                    ui.link(str(url), str(url), new_tab=True).classes("text-xs")

    def _rebuild(self) -> None:
        self._last_id = 0
        self.scroll.clear()
        if self._view is None:
            return
        with self.scroll:
            for event in self._view.events:
                if self._match(event):
                    self._row(event, self._view)
        if self._view.events:
            self._last_id = self._view.events[-1].id or 0
        self.scroll.scroll_to(percent=100)

    def update(self, view: RunView) -> None:
        first = self._view is None
        self._view = view
        if first:
            self._rebuild()
            return
        new_events = [event for event in view.events if (event.id or 0) > self._last_id]
        if not new_events:
            return
        with self.scroll:
            for event in new_events:
                if self._match(event):
                    self._row(event, view)
        self._last_id = max(event.id or 0 for event in new_events)
        self.scroll.scroll_to(percent=100)
