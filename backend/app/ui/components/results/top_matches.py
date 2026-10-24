"""Top-5 result cards."""

from __future__ import annotations

from nicegui import ui

from app.models.report import FinalReport, TopMatch
from app.ui.components.badges import (
    deadline_badge,
    eligibility_badge,
    source_link,
    verification_badge,
)


def _apply_url(match: TopMatch) -> str:
    opportunity = match.opportunity
    return opportunity.application_url or opportunity.official_url


def _card(match: TopMatch) -> None:
    opportunity = match.opportunity
    with ui.card().classes("w-full"):
        with ui.row().classes("w-full items-start justify-between no-wrap"):
            with ui.column().classes("gap-0"):
                ui.label(f"#{match.rank} {opportunity.name}").classes("text-lg font-semibold")
                ui.label(f"{opportunity.provider_org} · {opportunity.country or '—'}").classes(
                    "text-sm text-gray-500"
                )
            eligibility_badge(opportunity.eligibility)

        with ui.row().classes("flex-wrap items-center gap-2 my-1"):
            verification_badge(opportunity.verification)
            deadline_badge(opportunity.deadline)
            ui.badge(f"score {opportunity.score:.0f}/100", color="primary").props("rounded")
            if opportunity.funding_type != "unknown":
                ui.badge(opportunity.funding_type.replace("_", " "), color="teal").props("rounded")

        ui.linear_progress(value=min(1.0, opportunity.score / 100), show_value=False).props(
            "color=primary rounded"
        )
        if opportunity.funding_text:
            ui.label(opportunity.funding_text).classes("text-sm")
        ui.markdown(match.why_it_fits).classes("text-sm")

        if match.graph_paths:
            ui.label("Graph evidence").classes("text-xs font-semibold uppercase opacity-60")
            for path in match.graph_paths:
                with ui.row().classes("w-full items-start gap-1 no-wrap"):
                    ui.icon("route", size="14px").classes("mt-0.5 opacity-60")
                    ui.label(" → ".join(path)).classes("text-xs break-words flex-1")

        if opportunity.missing:
            ui.label("Missing: " + "; ".join(opportunity.missing)).classes("text-sm text-amber-700")

        with ui.expansion("How to apply", icon="list_alt").classes("w-full"):
            if opportunity.how_to_apply:
                for index, step in enumerate(opportunity.how_to_apply, start=1):
                    ui.label(f"{index}. {step}").classes("text-sm")
            else:
                ui.label("See the official page for application steps.").classes("text-sm text-gray-500")
            if opportunity.required_documents:
                ui.label("Documents: " + ", ".join(opportunity.required_documents)).classes("text-sm")

        with ui.row().classes("w-full items-center justify-between"):
            with ui.row().classes("flex-wrap gap-2"):
                for source in opportunity.sources[:4]:
                    source_link(source)
            ui.button(
                "Apply",
                icon="open_in_new",
                on_click=lambda url=_apply_url(match): ui.navigate.to(url, new_tab=True),
            ).props("color=primary")


def render_top_matches(report: FinalReport) -> None:
    if not report.top5:
        ui.label("No eligible matches were verified in this run.").classes("text-sm text-gray-500")
        return
    with ui.grid(columns=2).classes("w-full gap-4"):
        for match in report.top5:
            _card(match)
