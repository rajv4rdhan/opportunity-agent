"""A deterministic one-sentence result summary and three stat tiles."""

from __future__ import annotations

import html
from datetime import date

from nicegui import ui

from app.models.report import FinalReport


def _nearest(report: FinalReport) -> tuple[date, str] | None:
    dated = [
        (opportunity.deadline, opportunity.name)
        for opportunity in report.all_opportunities
        if opportunity.deadline and not opportunity.is_expired
    ]
    if not dated:
        return None
    return min(dated, key=lambda item: item[0])


def render_summary(report: FinalReport) -> None:
    verified = sum(
        1 for opportunity in report.all_opportunities if opportunity.verification != "unverified"
    )
    eligible = sum(1 for opportunity in report.all_opportunities if opportunity.eligibility == "eligible")
    strong = len(report.top5)
    nearest = _nearest(report)

    if report.all_opportunities:
        sentence = (
            f"We verified <strong>{verified} opportunities</strong> from official sources. "
            f"<strong>{strong} are strong matches</strong>."
        )
        if nearest:
            when, name = nearest
            sentence += (
                f" The nearest deadline is <strong>{when.strftime('%d %b %Y')}</strong> "
                f"({html.escape(name)})."
            )
    else:
        sentence = "We did not verify any opportunities this time. Try broadening the countries or budget."

    with ui.element("div").classes("ss-card w-full"):
        ui.html(f'<p class="ss-summary">{sentence}</p>', sanitize=False)
        with ui.row().classes("w-full items-start gap-8 flex-wrap mt-3"):
            for value, label, modifier in (
                (verified, "Verified", "ok"),
                (eligible, "Eligible now", "accent"),
                (len(report.gaps), "Unlockable with one step", "warn"),
            ):
                with ui.column().classes("ss-stat gap-0"):
                    ui.label(str(value)).classes("ss-stat-value").style(
                        f"color: var(--{modifier})"
                    )
                    ui.label(label).classes("ss-stat-label")
