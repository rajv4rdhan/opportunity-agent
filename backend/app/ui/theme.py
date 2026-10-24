"""Shared page frame: header, navigation and theme. No page builds its own header."""

from __future__ import annotations

from contextlib import contextmanager
from typing import Iterator

from nicegui import ui


@contextmanager
def frame(title: str) -> Iterator[None]:
    """Wrap a page body with the app header and a centred content column."""
    ui.colors(primary="#4f46e5")
    dark = ui.dark_mode()

    with ui.header().classes("items-center justify-between px-6 py-3 bg-indigo-700 text-white"):
        with ui.row().classes("items-center gap-3"):
            ui.icon("school", size="28px")
            ui.label("ScholarSwarm").classes("text-xl font-semibold")
            ui.label(title).classes("text-sm opacity-70")
        with ui.row().classes("items-center gap-2"):
            ui.link("New search", "/").classes("text-white no-underline")
            ui.link("History", "/runs").classes("text-white no-underline")
            ui.button(icon="dark_mode", on_click=dark.toggle).props("flat round color=white")

    with ui.column().classes("w-full max-w-7xl mx-auto p-4 gap-4"):
        yield
