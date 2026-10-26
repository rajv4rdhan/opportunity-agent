"""All opportunities and rejected candidates, with simple filters."""

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
            "id": opportunity.id or opportunity.name,
            "name": opportunity.name,
            "org": opportunity.provider_org,
            "country": opportunity.country or "—",
            "funding": opportunity.funding_type.replace("_", " "),
            "deadline": str(opportunity.deadline) if opportunity.deadline else "—",
            "eligibility": opportunity.eligibility.replace("_", " "),
            "score": round(opportunity.score),
            "verification": opportunity.verification.replace("_", " "),
            "url": opportunity.official_url,
        }
        for opportunity in report.all_opportunities
    ]


def render_opportunities(report: FinalReport) -> None:
    rows = _rows(report)
    countries = sorted({row["country"] for row in rows if row["country"] and row["country"] != "—"})

    with ui.row().classes("w-full items-center gap-2 flex-wrap"):
        eligibility = (
            ui.toggle(
                {"all": "All", "eligible": "Eligible", "partial": "Partial"},
                value="all",
            )
            .props("dense unelevated no-caps")
        )
        country = (
            ui.select(["All countries", *countries], value="All countries")
            .props("dense borderless options-dense")
            .classes("w-44")
        )
        count = ui.label("").classes("ss-small ml-auto")

    table = ui.table(columns=COLUMNS, rows=rows, row_key="id").props("dense flat").classes(
        "w-full"
    )

    def apply(_event=None) -> None:
        filtered = rows
        if eligibility.value != "all":
            filtered = [row for row in filtered if row["eligibility"] == eligibility.value]
        if country.value and country.value != "All countries":
            filtered = [row for row in filtered if row["country"] == country.value]
        table.rows = filtered
        table.update()
        count.text = f"{len(filtered)} of {len(rows)}"

    eligibility.on_value_change(apply)
    country.on_value_change(apply)
    apply()

    if report.rejected:
        with ui.expansion(f"Rejected candidates ({len(report.rejected)})", icon="block").classes(
            "w-full"
        ):
            ui.table(
                columns=[
                    {"name": "url", "label": "URL", "field": "url", "align": "left"},
                    {"name": "reason", "label": "Reason", "field": "reason", "align": "left"},
                ],
                rows=[rejection.model_dump() for rejection in report.rejected],
                row_key="url",
            ).props("dense flat").classes("w-full")
