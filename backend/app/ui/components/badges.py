"""All badge and source-link styling lives here."""

from __future__ import annotations

from datetime import date

from nicegui import ui

from app.core.utils import days_until, domain_of
from app.models.opportunity import Source

STATUS_MODIFIERS = {
    "queued": "is-idle",
    "running": "is-running",
    "waiting_input": "is-waiting",
    "finished": "is-done",
    "failed": "is-failed",
}
ELIGIBILITY_MODIFIERS = {
    "eligible": "is-done",
    "partial": "is-waiting",
    "not_eligible": "is-failed",
    "unknown": "is-idle",
}
VERIFICATION_MODIFIERS = {
    "verified_official": "is-done",
    "third_party": "is-waiting",
    "unverified": "is-idle",
}


def _pill(text: str, modifier: str, icon: str | None = None):
    with ui.row().classes(f"ss-pill {modifier}") as pill:
        if icon:
            ui.icon(icon, size="12px")
        ui.label(text)
    return pill


def status_badge(status: str):
    value = status.replace("_", " ")
    return _pill(value, STATUS_MODIFIERS.get(status, "is-idle"))


def eligibility_badge(value: str):
    labels = {
        "eligible": "Eligible",
        "partial": "Partial",
        "not_eligible": "Not eligible",
        "unknown": "Unknown",
    }
    return _pill(
        labels.get(value, value.replace("_", " ").title()),
        ELIGIBILITY_MODIFIERS.get(value, "is-idle"),
    )


def verification_badge(value: str):
    labels = {
        "verified_official": "Official source",
        "third_party": "Third-party source",
        "unverified": "Unverified",
    }
    return _pill(
        labels.get(value, value.replace("_", " ").title()),
        VERIFICATION_MODIFIERS.get(value, "is-idle"),
    )


def deadline_badge(deadline: date | None):
    if deadline is None:
        return _pill("No date", "is-idle")
    remaining = days_until(deadline)
    if remaining is None:
        return _pill("No date", "is-idle")
    if remaining < 0:
        return _pill(f"Expired {-remaining}d ago", "is-idle")
    modifier = "is-failed" if remaining < 14 else "is-waiting" if remaining < 45 else "is-done"
    return _pill(f"{remaining}d left", modifier)


def source_link(source: Source):
    link = ui.link(domain_of(source.url) or source.url, source.url, new_tab=True).classes("text-xs")
    if source.quote:
        link.tooltip(source.quote[:400])
    return link
