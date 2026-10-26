"""Gap cards and the instant What-If recalculation ("Unlock more")."""

from __future__ import annotations

from nicegui import ui

from app.models.opportunity import Gap
from app.models.report import FinalReport
from app.services import matching


def _gap_cards(gaps: list[Gap]) -> None:
    if not gaps:
        ui.label("No gaps — every requirement is met or unknown.").classes("ss-small")
        return
    for gap in gaps:
        with ui.element("div").classes("ss-card ss-card--tight w-full"):
            with ui.row().classes("w-full items-start justify-between gap-2"):
                ui.label(gap.requirement).classes("text-base font-semibold")
                ui.label(f"unlocks {len(gap.unlocks)}").classes("ss-pill is-running")
            if gap.unlocks:
                with ui.row().classes("flex-wrap gap-1 mt-1"):
                    for name in gap.unlocks[:6]:
                        ui.label(name).classes("ss-chip")
            ui.label(gap.suggestion).classes("ss-small mt-1")


class GapsWhatIf:
    def __init__(self, run_id: str, report: FinalReport) -> None:
        self.run_id = run_id
        self.report = report
        self.before = {
            opportunity.id: opportunity.eligibility for opportunity in report.all_opportunities
        }
        self.result = None

        ui.label("Unlock more").classes("ss-h2")
        ui.label(
            "One realistic improvement can change several decisions. Recalculate instantly; "
            "no LLM calls."
        ).classes("ss-small")
        self.gap_container = ui.column().classes("w-full gap-2")
        with self.gap_container:
            _gap_cards(report.gaps)

        profile = report.profile
        with ui.element("div").classes("ss-card ss-card--tight w-full mt-2"):
            ui.label("What if?").classes("ss-small")
            with ui.row().classes("w-full items-end gap-3 flex-wrap"):
                self.cgpa = ui.number("CGPA", value=profile.cgpa, step=0.1, min=0).classes("w-28")
                self.ielts = ui.number(
                    "IELTS", value=profile.test_scores.ielts, step=0.5, min=0, max=9
                ).classes("w-28")
                self.toefl = ui.number(
                    "TOEFL", value=profile.test_scores.toefl, step=1, min=0, max=120
                ).classes("w-28")
                self.gre = ui.number(
                    "GRE", value=profile.test_scores.gre, step=1, min=0, max=340
                ).classes("w-28")
                self.work = ui.number(
                    "Work experience (years)", value=profile.work_experience_years, step=0.5, min=0
                ).classes("w-44")
                ui.button("Recalculate", icon="calculate", on_click=self.recalculate).props(
                    "color=primary unelevated no-caps"
                )

        self.result = ui.label("").classes("ss-small")

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
            self.result.classes(replace="text-sm font-medium")
            self.result.style("color: var(--ok)")
        elif gaps:
            self.result.text = "No new opportunities unlocked yet. The remaining gaps are below."
            self.result.classes(replace="ss-small")
            self.result.style("")
        else:
            self.result.text = "No changes in eligibility."
            self.result.classes(replace="ss-small")
            self.result.style("")
        self.gap_container.clear()
        with self.gap_container:
            _gap_cards(gaps)
