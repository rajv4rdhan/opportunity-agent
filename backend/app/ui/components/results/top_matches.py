"""Vertical top-match cards with requirements, quotes and application steps."""

from __future__ import annotations

from nicegui import ui

from app.models.report import FinalReport, TopMatch
from app.ui.components.badges import (
    deadline_badge,
    eligibility_badge,
    source_link,
    verification_badge,
)
from app.ui.components.results.requirement_list import render_requirements

WHY_LIMIT = 260


def _apply_url(match: TopMatch) -> str:
    return match.opportunity.application_url or match.opportunity.official_url


def _why_it_fits(match: TopMatch) -> str:
    return (match.why_it_fits or "").strip() or "; ".join(match.opportunity.fit_reasons)


def _why_block(match: TopMatch) -> None:
    text = _why_it_fits(match)
    if not text:
        return
    ui.label("Why you").classes("ss-small")
    body = ui.markdown(text).classes("text-sm ss-why")
    if len(text) > WHY_LIMIT:
        body.style(
            "display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;"
        )

        def show_all() -> None:
            body.style("")
            more.set_visibility(False)

        more = ui.button("More", on_click=show_all).props("flat dense no-caps").classes("ss-small")


def _key_facts(match: TopMatch) -> None:
    opportunity = match.opportunity
    with ui.row().classes("w-full items-start gap-6 flex-wrap py-2"):
        with ui.column().classes("gap-0 min-w-[180px]"):
            ui.label("Funding").classes("ss-small")
            funding = opportunity.funding_type.replace("_", " ")
            ui.label(funding.title()).classes("text-sm font-medium")
            if opportunity.funding_text:
                ui.label(opportunity.funding_text).classes("ss-small")
        with ui.column().classes("gap-1 min-w-[130px]"):
            ui.label("Deadline").classes("ss-small")
            deadline_badge(opportunity.deadline)
            if not opportunity.deadline and opportunity.deadline_text:
                ui.label(opportunity.deadline_text).classes("ss-small")
        with ui.column().classes("gap-1 min-w-[110px]"):
            ui.label("Eligibility").classes("ss-small")
            eligibility_badge(opportunity.eligibility)
        with ui.column().classes("gap-1 min-w-[130px]"):
            ui.label("Source").classes("ss-small")
            verification_badge(opportunity.verification)


def _footer(match: TopMatch) -> None:
    opportunity = match.opportunity
    with ui.row().classes("w-full items-center justify-between gap-2 flex-wrap pt-2"):
        with ui.row().classes("flex-wrap items-center gap-2"):
            seen: set[str] = set()
            for source in opportunity.sources:
                if source.url in seen:
                    continue
                seen.add(source.url)
                source_link(source)
                if len(seen) >= 4:
                    break
        url = _apply_url(match)
        if url:
            ui.button(
                "Apply",
                icon="open_in_new",
                on_click=lambda target=url: ui.navigate.to(target, new_tab=True),
            ).props("color=primary unelevated no-caps")


def _card(match: TopMatch) -> None:
    opportunity = match.opportunity
    with ui.element("div").classes("ss-card w-full"):
        with ui.row().classes("w-full items-start justify-between gap-3 no-wrap"):
            with ui.row().classes("items-start gap-3 no-wrap min-w-0"):
                ui.label(f"#{match.rank}").classes("text-3xl font-semibold ss-muted leading-none")
                with ui.column().classes("gap-0 min-w-0"):
                    ui.label(opportunity.name).classes("text-xl font-semibold leading-tight")
                    ui.label(
                        f"{opportunity.provider_org} · {opportunity.country or '—'}"
                    ).classes("ss-small")
            with ui.column().classes("items-end gap-0"):
                ui.label(f"{opportunity.score:.0f}% match").classes("text-sm font-medium")
                with ui.element("div").classes("ss-thin-bar"):
                    ui.element("span").style(f"width: {min(100, opportunity.score):.0f}%")

        _key_facts(match)
        _why_block(match)

        if opportunity.missing:
            ui.label("Missing: " + "; ".join(opportunity.missing)).classes("ss-small").style(
                "color: var(--warn)"
            )

        with ui.expansion(
            f"Requirements ({len(opportunity.requirements)})", icon="checklist"
        ).classes("w-full"):
            render_requirements(opportunity)

        with ui.expansion("How to apply", icon="list_alt").classes("w-full"):
            if opportunity.how_to_apply:
                for index, step in enumerate(opportunity.how_to_apply, start=1):
                    ui.label(f"{index}. {step}").classes("text-sm")
            else:
                ui.label("See the official page for application steps.").classes("ss-small")
            if opportunity.required_documents:
                ui.label("Documents: " + ", ".join(opportunity.required_documents)).classes(
                    "text-sm"
                )
            if opportunity.deadline_text and opportunity.deadline:
                ui.label(opportunity.deadline_text).classes("ss-small")

        if match.graph_paths:
            with ui.row().classes("items-center gap-1 flex-wrap pt-1"):
                ui.label("Graph evidence").classes("ss-small")
                for path in match.graph_paths[:3]:
                    ui.label(" → ".join(path)).classes("ss-chip")

        _footer(match)


def render_top_matches(report: FinalReport) -> None:
    if not report.top5:
        ui.label("No eligible matches were verified in this run.").classes("ss-empty")
        return
    with ui.column().classes("w-full gap-4"):
        for match in report.top5:
            _card(match)
