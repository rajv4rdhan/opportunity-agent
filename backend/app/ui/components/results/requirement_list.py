"""Requirement checklist with source quotes."""

from __future__ import annotations

from nicegui import ui

from app.core.utils import domain_of
from app.models.opportunity import Opportunity, Requirement

ICONS = {"yes": ("check_circle", "yes"), "no": ("cancel", "no"), "unknown": ("help", "unknown")}


def _tooltip(opportunity: Opportunity, requirement: Requirement) -> str:
    domain = ""
    for source in opportunity.sources:
        if requirement.quote and source.quote == requirement.quote:
            domain = domain_of(source.url)
            break
    if not domain and opportunity.sources:
        domain = domain_of(opportunity.sources[0].url)
    if requirement.quote:
        return f'"{requirement.quote}"' + (f"\n— {domain}" if domain else "")
    return requirement.evidence or "No source quote for this requirement."


def render_requirements(opportunity: Opportunity) -> None:
    if not opportunity.requirements:
        ui.label("No requirements were extracted from the official page.").classes("ss-small")
        return
    for requirement in opportunity.requirements:
        icon, modifier = ICONS.get(requirement.met, ICONS["unknown"])
        with ui.row().classes("ss-requirement no-wrap"):
            ui.icon(icon, size="16px").classes(f"ss-requirement-icon is-{modifier} mt-0.5")
            with ui.column().classes("gap-0 flex-1 min-w-0"):
                ui.label(requirement.description).classes("text-sm")
                if requirement.evidence:
                    ui.label(requirement.evidence).classes("ss-small")
            info = ui.icon("info", size="14px").classes("ss-muted mt-0.5 cursor-help")
            info.tooltip(_tooltip(opportunity, requirement))
