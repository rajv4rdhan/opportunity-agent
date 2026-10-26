"""Shared page frame: header, navigation, fonts and the design system."""

from __future__ import annotations

from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

from nicegui import ui

STATIC_DIR = Path(__file__).resolve().parent / "static"

FONT_HEAD = """
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/static/theme.css">
"""


@contextmanager
def frame(title: str) -> Iterator[None]:
    """Wrap a page body with the app header and a centred content column."""
    ui.colors(primary="#4F46E5")
    dark = ui.dark_mode()
    ui.page_title(f"{title} · ScholarSwarm")
    ui.add_head_html(FONT_HEAD)

    with ui.header().classes("ss-header"):
        with ui.row().classes("ss-header-inner"):
            ui.link("ScholarSwarm", "/").classes("ss-wordmark")
            with ui.row().classes("ss-nav"):
                ui.link("New search", "/").classes("ss-nav-link")
                ui.link("History", "/runs").classes("ss-nav-link")
                ui.button(icon="dark_mode", on_click=dark.toggle).props(
                    "flat round dense"
                ).classes("ss-icon-btn").tooltip("Toggle dark mode")

    with ui.column().classes("ss-main"):
        yield
