"""Live run page: agent board, event feed, browser, knowledge graph and results."""

from __future__ import annotations

from nicegui import ui

from app.config import settings
from app.core import store
from app.models.report import FinalReport
from app.services.report import report_to_markdown
from app.ui.components.agent_flow import AgentFlow
from app.ui.components.badges import status_badge
from app.ui.components.event_feed import EventFeed
from app.ui.components.interrupt_dialog import InterruptDialog
from app.ui.components.knowledge_graph import KnowledgeGraph
from app.ui.components.live_browser import LiveBrowser
from app.ui.components.results.gaps_whatif import GapsWhatIf
from app.ui.components.results.opportunity_table import render_opportunities
from app.ui.components.results.sop_viewer import render_sop
from app.ui.components.results.top_matches import render_top_matches
from app.ui.components.run_stats import RunStatsBar
from app.ui.live_state import RunView, reduce_event
from app.ui.theme import frame


@ui.page("/runs/{run_id}")
async def run_detail_page(run_id: str) -> None:
    run = await store.get_run(run_id)
    if run is None:
        with frame("Run"):
            ui.label(f"Run {run_id} was not found.").classes("text-lg text-red-600")
            ui.button("Back to history", on_click=lambda: ui.navigate.to("/runs"))
        return

    view = RunView(run_id=run_id, status=run["status"])
    if run.get("pending_questions"):
        view.interrupt = run["pending_questions"]

    with frame("Live run"):
        header = ui.row().classes("w-full items-center gap-3")
        stats = RunStatsBar()
        errors = ui.column().classes("w-full gap-1")

        with ui.row().classes("w-full flex-wrap xl:flex-nowrap gap-4 items-start"):
            with ui.column().classes("w-full xl:w-3/5 gap-3"):
                flow = AgentFlow()
                feed = EventFeed()
            with ui.column().classes("w-full xl:w-2/5 gap-3"):
                with ui.tabs().classes("w-full") as right_tabs:
                    browser_tab = ui.tab("Live Browser")
                    graph_tab = ui.tab("Knowledge Graph")
                    candidates_tab = ui.tab("Candidates")
                with ui.tab_panels(right_tabs, value=browser_tab).classes("w-full"):
                    with ui.tab_panel(browser_tab):
                        browser = LiveBrowser()
                    with ui.tab_panel(graph_tab):
                        graph = KnowledgeGraph()
                    with ui.tab_panel(candidates_tab):
                        candidates = ui.column().classes("w-full")

        dialog = InterruptDialog(run_id)
        results = ui.column().classes("w-full gap-3")

    def refresh_header() -> None:
        header.clear()
        with header:
            ui.label((view.report.profile.name if view.report else run.get("student_name")) or "Student").classes(
                "text-xl font-semibold"
            )
            status_badge(view.status)
            ui.label(f"run {run_id}").classes("text-xs text-gray-400")
            ui.button("History", icon="history", on_click=lambda: ui.navigate.to("/runs")).props("flat dense")

    def render_candidates() -> None:
        candidates.clear()
        with candidates:
            if not view.candidates:
                ui.label("Candidates appear here as the Scout finds them.").classes(
                    "text-sm text-gray-500 p-2"
                )
                return
            for candidate in view.candidates[-80:]:
                if not candidate.get("url"):
                    continue
                with ui.row().classes("w-full items-center gap-2 no-wrap"):
                    ui.icon(
                        "verified" if candidate.get("official") else "travel_explore",
                        color="green" if candidate.get("official") else "grey",
                        size="16px",
                    )
                    ui.link(candidate.get("title") or candidate["url"], candidate["url"], new_tab=True).classes(
                        "text-sm truncate"
                    )
                    ui.label(candidate.get("provider", "")).classes("text-xs text-gray-400")

    def render_results(report: FinalReport) -> None:
        results.clear()
        with results:
            ui.separator()
            with ui.row().classes("w-full items-center justify-between"):
                ui.label("Results").classes("text-2xl font-bold")
                ui.button(
                    "Download full report",
                    icon="download",
                    on_click=lambda: ui.download(report_to_markdown(report).encode(), "report.md"),
                ).props("outline")
            with ui.tabs().classes("w-full") as tabs:
                top_tab = ui.tab("Top 5")
                all_tab = ui.tab("All opportunities")
                gaps_tab = ui.tab("Gaps & What-if")
                sop_tab = ui.tab("SOP")
            with ui.tab_panels(tabs, value=top_tab).classes("w-full"):
                with ui.tab_panel(top_tab):
                    render_top_matches(report)
                with ui.tab_panel(all_tab):
                    render_opportunities(report)
                with ui.tab_panel(gaps_tab):
                    GapsWhatIf(run_id, report)
                with ui.tab_panel(sop_tab):
                    render_sop(report)

    async def tick() -> None:
        changed: set[str] = set()
        for event in await store.events_after(run_id, view.last_event_id):
            changed |= reduce_event(view, event)
        if changed:
            if "flow" in changed:
                flow.update(view)
            if "feed" in changed:
                feed.update(view)
            if "stats" in changed:
                stats.update(view)
            if "browser" in changed:
                browser.update(view)
            if "dialog" in changed:
                dialog.update(view)
            if "candidates" in changed:
                render_candidates()
            if "graph" in changed:
                await graph.refresh(view)
            refresh_header()

        if view.finished:
            if view.report is None:
                fresh = await store.get_run(run_id)
                if fresh and fresh.get("report"):
                    view.report = FinalReport.model_validate(fresh["report"])
                    view.status = fresh["status"]
                    view.stats = view.report.stats
                    render_results(view.report)
                    stats.update(view)
                    refresh_header()
                elif fresh and fresh["status"] == "failed":
                    view.status = "failed"
                    errors.clear()
                    with errors:
                        ui.label(f"Run failed: {fresh.get('error') or 'unknown error'}").classes(
                            "text-sm text-red-700"
                        )
                    refresh_header()
            timer.deactivate()

    refresh_header()
    render_candidates()
    if view.interrupt:
        dialog.update(view)
    timer = ui.timer(settings.ui_poll_seconds, tick)
