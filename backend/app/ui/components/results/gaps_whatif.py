"""Gap cards and the instant What-If recalculation."""

from __future__ import annotations

from nicegui import ui

from app.models.opportunity import Gap
from app.models.report import FinalReport
from app.services import matching


def _gap_cards(gaps: list[Gap]) -> None:
    if not gaps:
        ui.label("No gaps — every requirement is met or unknown.").classes("text-sm text-gray-500")
        return
    for gap in gaps:
        with ui.card().classes("w-full"):
            ui.label(gap.requirement).classes("text-base font-semibold")
            ui.label(f"Unlocks {len(gap.unlocks)}: {', '.join(gap.unlocks)}").classes("text-sm")
            ui.label(gap.suggestion).classes("text-sm text-gray-500")


class GapsWhatIf:
    def __init__(self, run_id: str, report: FinalReport) -> None:
        self.run_id = run_id
        self.report = report
        self.before = {opportunity.id: opportunity.eligibility for opportunity in report.all_opportunities}
        self.result = None

        ui.label("What one improvement unlocks").classes("text-lg font-semibold")
        self.gap_container = ui.column().classes("w-full gap-2")
        with self.gap_container:
            _gap_cards(report.gaps)

        profile = report.profile
        with ui.row().classes("w-full gap-4 items-end"):
            self.cgpa = ui.number("CGPA", value=profile.cgpa, step=0.1, min=0).classes("w-32")
            self.ielts = ui.number("IELTS", value=profile.test_scores.ielts, step=0.5, min=0, max=9).classes("w-32")
            self.toefl = ui.number("TOEFL", value=profile.test_scores.toefl, step=1, min=0, max=120).classes("w-32")
            self.gre = ui.number("GRE", value=profile.test_scores.gre, step=1, min=0, max=340).classes("w-32")
            self.work = ui.number(
                "Work experience (years)", value=profile.work_experience_years, step=0.5, min=0
            ).classes("w-48")
            ui.button("Recalculate", icon="calculate", on_click=self.recalculate).props("color=primary")

        self.result = ui.label("Change a number and recalculate — no LLM calls, instant.").classes(
            "text-sm text-gray-500"
        )

    async def recalculate(self) -> None:
        overrides = {
            "cgpa": self.cgpa.value,
            "test_scores.ielts": self.ielts.value,
            "test_scores.toefl": self.toefl.value,
            "test_scores.gre": self.gre.value,
            "work_experience_years": self.work.value,
        }
        opportunities, gaps = await matching.whatif(self.run_id, overrides)
        rank = {"not_eligible": 0, "unknown": 1, "partial": 2, "eligible": 3}
        newly = [
            opportunity.name
            for opportunity in opportunities
            if rank[opportunity.eligibility] > rank.get(self.before.get(opportunity.id, "unknown"), 1)
        ]
        if newly:
            self.result.text = f"Newly unlocked: {', '.join(newly)}"
            self.result.classes(replace="text-sm text-green-700 font-medium")
        elif gaps:
            self.result.text = "No new opportunities unlocked yet. The remaining gaps are below."
            self.result.classes(replace="text-sm text-gray-500")
        else:
            self.result.text = "No changes in eligibility."
            self.result.classes(replace="text-sm text-gray-500")
        self.gap_container.clear()
        with self.gap_container:
            _gap_cards(gaps)
