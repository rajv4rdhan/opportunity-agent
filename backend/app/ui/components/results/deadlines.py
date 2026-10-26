"""Deadline list sorted by date, with a calendar download."""

from __future__ import annotations

from nicegui import ui

from app.core.utils import days_until
from app.models.report import FinalReport
from app.services.calendar import deadlines_ics
from app.ui.components.badges import deadline_badge


def _row(opportunity) -> None:
    with ui.row().classes("w-full items-center gap-3 flex-wrap py-2"):
        deadline_badge(opportunity.deadline)
        with ui.column().classes("gap-0 flex-1 min-w-0"):
            if opportunity.official_url:
                ui.link(opportunity.name, opportunity.official_url, new_tab=True).classes("text-sm")
            else:
                ui.label(opportunity.name).classes("text-sm")
            ui.label(
                f"{opportunity.provider_org} · {opportunity.country or '—'}"
            ).classes("ss-small")
        ui.label(opportunity.deadline.strftime("%d %b %Y")).classes("ss-small ss-mono")


def render_deadlines(report: FinalReport) -> None:
    dated = sorted(
        (opportunity for opportunity in report.all_opportunities if opportunity.deadline),
        key=lambda opportunity: opportunity.deadline,
    )
    upcoming = [opportunity for opportunity in dated if (days_until(opportunity.deadline) or 0) >= 0]
    expired = [opportunity for opportunity in dated if (days_until(opportunity.deadline) or 0) < 0]

    with ui.row().classes("w-full items-center justify-between gap-2 flex-wrap"):
        ui.label("Deadlines").classes("ss-h2")
        ui.button(
            "Add all to calendar",
            icon="event",
            on_click=lambda: ui.download(deadlines_ics(report).encode(), "deadlines.ics"),
        ).props("color=primary unelevated no-caps")

    if not dated:
        ui.label("No dated deadlines were found. Check the official pages before applying.").classes(
            "ss-empty"
        )
        return

    with ui.element("div").classes("ss-card ss-card--tight w-full"):
        if upcoming:
            for opportunity in upcoming:
                _row(opportunity)
        else:
            ui.label("No upcoming deadlines; all dated opportunities have passed.").classes("ss-small")

    if expired:
        with ui.expansion(f"Expired ({len(expired)})", icon="history").classes("w-full"):
            for opportunity in expired:
                _row(opportunity)
