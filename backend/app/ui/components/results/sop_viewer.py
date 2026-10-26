"""The SOP as a document, with highlighted placeholders and critic notes."""

from __future__ import annotations

import re

import markdown2
from nicegui import ui

from app.models.report import FinalReport

PLACEHOLDER = re.compile(r"\[ADD:[^\]]*\]")


def _document(sop: str) -> str:
    rendered = markdown2.markdown(
        sop, extras=["fenced-code-blocks", "tables", "break-on-newline"]
    )
    return PLACEHOLDER.sub(
        lambda match: f'<span class="ss-placeholder">{match.group(0)}</span>', rendered
    )


def render_sop(report: FinalReport) -> None:
    if not report.sop_markdown:
        ui.label("No SOP was generated for this run.").classes("ss-empty")
        return

    sop = report.sop_markdown
    words = len(sop.split())

    async def copy() -> None:
        await ui.clipboard.write(sop)
        ui.notify("SOP copied", type="positive")

    with ui.row().classes("w-full items-center justify-between gap-2 flex-wrap"):
        with ui.column().classes("gap-0"):
            ui.label(f"For: {report.sop_for or 'your top match'}").classes("ss-h2")
            ui.label(f"{words} words · {len(report.critic_notes)} critic note(s)").classes(
                "ss-small"
            )
        with ui.row().classes("items-center gap-1"):
            ui.button("Copy", icon="content_copy", on_click=copy).props("flat no-caps")
            ui.button(
                "Download .md",
                icon="download",
                on_click=lambda: ui.download(sop.encode(), "sop.md"),
            ).props("flat no-caps")

    with ui.row().classes("w-full flex-col xl:flex-row gap-4 items-start"):
        with ui.element("div").classes("ss-card w-full xl:w-[70%]"):
            ui.html(_document(sop), sanitize=False).classes("ss-document")
        with ui.element("div").classes("ss-card ss-card--tight w-full xl:w-[28%]"):
            ui.label("Critic notes").classes("ss-small")
            if report.critic_notes:
                for note in report.critic_notes:
                    ui.label(f"· {note}").classes("text-sm")
            else:
                ui.label("The Critic accepted the draft without notes.").classes("ss-small")
