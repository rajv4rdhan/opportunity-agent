"""Kernel live-view iframe."""

from __future__ import annotations

from nicegui import ui

from app.ui.live_state import RunView


class LiveBrowser:
    def __init__(self) -> None:
        self.container = ui.column().classes("w-full")
        self._url: str | None = None
        with self.container:
            ui.label("The cloud browser appears here when the verifier reaches a page.").classes(
                "text-sm text-gray-500 p-4"
            )

    def update(self, view: RunView) -> None:
        if not view.live_view_url or view.live_view_url == self._url:
            return
        self._url = view.live_view_url
        self.container.clear()
        with self.container:
            ui.label("Live cloud browser").classes("text-sm text-gray-500")
            ui.element("iframe").props(f'src="{self._url}"').classes("w-full border rounded bg-white").style("height: 480px")
