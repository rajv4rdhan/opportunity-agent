"""All badge and source-link styling lives here."""

from __future__ import annotations

from datetime import date

from nicegui import ui

from app.core.utils import days_until, domain_of
from app.models.opportunity import Source

STATUS_COLORS = {
    "queued": "grey",
    "running": "blue",
    "waiting_input": "purple",
    "finished": "green",
    "failed": "red",
}
ELIGIBILITY_COLORS = {"eligible": "green", "partial": "orange", "not_eligible": "red", "unknown": "grey"}
VERIFICATION_COLORS = {"verified_official": "green", "third_party": "orange", "unverified": "grey"}


def status_badge(status: str):
    return ui.badge(status.replace("_", " "), color=STATUS_COLORS.get(status, "grey")).props("rounded")


def eligibility_badge(value: str):
    return ui.badge(value.replace("_", " "), color=ELIGIBILITY_COLORS.get(value, "grey")).props("rounded")


def verification_badge(value: str):
    return ui.badge(value.replace("_", " "), color=VERIFICATION_COLORS.get(value, "grey")).props("rounded")


def deadline_badge(deadline: date | None):
    if deadline is None:
        return ui.badge("no deadline", color="grey").props("rounded")
    remaining = days_until(deadline)
    if remaining is None:
        return ui.badge("no deadline", color="grey").props("rounded")
    if remaining < 0:
        return ui.badge(f"expired {-remaining}d ago", color="grey").props("rounded")
    color = "red" if remaining < 14 else "orange" if remaining < 45 else "green"
    return ui.badge(f"{remaining}d left", color=color).props("rounded")


def source_link(source: Source):
    link = ui.link(domain_of(source.url) or source.url, source.url, new_tab=True).classes("text-xs")
    if source.quote:
        link.tooltip(source.quote[:400])
    return link
