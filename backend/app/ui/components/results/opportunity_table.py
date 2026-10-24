"""Full opportunity table and the rejected list."""

from __future__ import annotations

from nicegui import ui

from app.models.report import FinalReport

COLUMNS = [
    {"name": "name", "label": "Name", "field": "name", "align": "left", "sortable": True},
    {"name": "org", "label": "Provider", "field": "org", "align": "left", "sortable": True},
    {"name": "country", "label": "Country", "field": "country", "align": "left", "sortable": True},
    {"name": "funding", "label": "Funding", "field": "funding", "align": "left", "sortable": True},
    {"name": "deadline", "label": "Deadline", "field": "deadline", "align": "left", "sortable": True},
    {"name": "eligibility", "label": "Eligibility", "field": "eligibility", "align": "left", "sortable": True},
    {"name": "score", "label": "Score", "field": "score", "align": "right", "sortable": True},
    {"name": "verification", "label": "Verification", "field": "verification", "align": "left"},
    {"name": "url", "label": "Source", "field": "url", "align": "left"},
]


def _rows(report: FinalReport) -> list[dict]:
    return [
        {
            "id": opportunity.id,
            "name": opportunity.name,
            "org": opportunity.provider_org,
            "country": opportunity.country or "—",
            "funding": opportunity.funding_type,
            "deadline": str(opportunity.deadline) if opportunity.deadline else "—",
            "eligibility": opportunity.eligibility,
            "score": opportunity.score,
            "verification": opportunity.verification,
            "url": opportunity.official_url,
        }
        for opportunity in report.all_opportunities
    ]


def render_opportunities(report: FinalReport) -> None:
    table = ui.table(columns=COLUMNS, rows=_rows(report), row_key="id").classes("w-full")
    ui.input("Filter").bind_value(table, "filter").classes("w-72")

    if report.rejected:
        with ui.expansion(f"Rejected candidates ({len(report.rejected)})", icon="block").classes("w-full"):
            ui.table(
                columns=[
                    {"name": "url", "label": "URL", "field": "url", "align": "left"},
                    {"name": "reason", "label": "Reason", "field": "reason", "align": "left"},
                ],
                rows=[rejection.model_dump() for rejection in report.rejected],
                row_key="url",
            ).classes("w-full")
