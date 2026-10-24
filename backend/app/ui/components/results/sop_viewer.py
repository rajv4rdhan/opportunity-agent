"""SOP viewer with copy/download and the critic's notes."""

from __future__ import annotations

from nicegui import ui

from app.models.report import FinalReport


def render_sop(report: FinalReport) -> None:
    if not report.sop_markdown:
        ui.label("No SOP was generated for this run.").classes("text-sm text-gray-500")
        return

    sop = report.sop_markdown

    async def copy() -> None:
        await ui.clipboard.write(sop)
        ui.notify("SOP copied", type="positive")

    with ui.row().classes("w-full items-center justify-between"):
        ui.label(f"Statement of purpose — {report.sop_for or 'top match'}").classes("text-lg font-semibold")
        with ui.row():
            ui.button("Copy", icon="content_copy", on_click=copy).props("flat")
            ui.button(
                "Download .md",
                icon="download",
                on_click=lambda: ui.download(sop.encode(), "sop.md"),
            ).props("flat")

    ui.markdown(sop).classes("w-full")
    if report.critic_notes:
        with ui.expansion(f"Critic notes ({len(report.critic_notes)})", icon="rule").classes("w-full"):
            for note in report.critic_notes:
                ui.label(f"• {note}").classes("text-sm")
