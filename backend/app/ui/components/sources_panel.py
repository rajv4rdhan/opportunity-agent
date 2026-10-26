"""Candidates and the live verification state of every source."""

from __future__ import annotations

from nicegui import ui

from app.core.utils import normalize_url
from app.ui.live_state import RunView


class SourcesPanel:
    def __init__(self) -> None:
        self._signature: tuple | None = None
        self.container = ui.column().classes("w-full gap-2")
        self.scroll = ui.scroll_area().classes("w-full").style("height: 430px")

    def _signature_for(self, view: RunView) -> tuple:
        return (
            len(view.candidates),
            tuple((key, worker.state) for key, worker in view.workers.items()),
        )

    def update(self, view: RunView) -> None:
        signature = self._signature_for(view)
        if signature == self._signature:
            return
        self._signature = signature
        self.scroll.clear()
        with self.scroll:
            if not view.candidates:
                ui.label("Candidates appear here as the Scout finds them.").classes("ss-empty")
                return
            ui.label(f"{len(view.candidates)} candidate(s) found").classes("ss-small")
            for candidate in view.candidates[-100:]:
                url = candidate.get("url") or ""
                if not url:
                    continue
                key = normalize_url(url)
                worker = view.workers.get(key)
                with ui.row().classes("w-full items-start gap-2 no-wrap py-1"):
                    domain = (worker.domain if worker else "") or (
                        url.split("//")[-1].split("/")[0] if "//" in url else url
                    )
                    ui.element("img").props(
                        f'src="https://www.google.com/s2/favicons?domain={domain}&sz=32"'
                    ).classes("w-4 h-4 rounded mt-1")
                    with ui.column().classes("gap-0 flex-1 min-w-0"):
                        ui.link(candidate.get("title") or url, url, new_tab=True).classes(
                            "text-sm truncate"
                        )
                        with ui.row().classes("items-center gap-2"):
                            ui.label(candidate.get("provider", "")).classes("ss-small")
                            if candidate.get("official"):
                                with ui.row().classes("items-center gap-0.5"):
                                    ui.icon("verified", size="12px").style("color: var(--ok)")
                                    ui.label("official").classes("ss-small")
                    if worker:
                        text = worker.state
                        modifier = worker.state
                        if worker.flash_until >= view.tick:
                            modifier = "is-fallback"
                            text = "fallback"
                        state_label = ui.label(text).classes(f"ss-worker is-{modifier}")
                        tooltip = "\n".join(
                            part for part in (worker.title, worker.message, worker.reason) if part
                        )
                        if tooltip:
                            state_label.tooltip(tooltip)
