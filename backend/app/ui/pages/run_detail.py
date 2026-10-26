"""Live run page: mission control, then the results."""

from __future__ import annotations

from nicegui import ui

from app.config import settings
from app.core import store
from app.models.report import FinalReport
from app.services.report import report_to_markdown
from app.ui.agents import PHASE_INDEX
from app.ui.components.activity import Activity
from app.ui.components.badges import status_badge
from app.ui.components.input_request import InputRequest
from app.ui.components.knowledge_graph import KnowledgeGraph
from app.ui.components.live_browser import LiveBrowser
from app.ui.components.phase_bar import PhaseBar
from app.ui.components.profile_card import ProfileCard
from app.ui.components.results.gaps_whatif import GapsWhatIf
from app.ui.components.results.opportunity_table import render_opportunities
from app.ui.components.results.sop_viewer import render_sop
from app.ui.components.results.top_matches import render_top_matches
from app.ui.components.run_summary import RunSummary
from app.ui.components.sources_panel import SourcesPanel
from app.ui.components.swarm_canvas import SwarmCanvas
from app.ui.live_state import RunView, reduce_event
from app.ui.theme import frame


@ui.page("/runs/{run_id}")
async def run_detail_page(run_id: str, replay: int = 0, speed: float = 20) -> None:
    run = await store.get_run(run_id)
    if run is None:
        with frame("Run"):
            ui.label(f"Run {run_id} was not found.").classes("text-lg").style("color: var(--err)")
            ui.button("Back to history", on_click=lambda: ui.navigate.to("/runs")).props(
                "flat no-caps"
            )
        return

    view = RunView(run_id=run_id, status=run["status"])
    for event in await store.events_after(run_id, 0, 5000):
        reduce_event(view, event)
    if run.get("student_name") and not view.student_name:
        view.student_name = run["student_name"]
    if run.get("pending_questions") and not view.interrupt:
        view.interrupt = run["pending_questions"]
    if run.get("report"):
        view.report = FinalReport.model_validate(run["report"])
        view.stats = view.report.stats
        view.finished = True

    median = await store.median_duration_sec()
    state = {"collapsed": False, "title": None}

    with frame("Live run"):
        header = ui.row().classes("w-full items-center gap-3 flex-wrap")
        with header:
            name_label = ui.label("Student").classes("ss-h2")
            status_box = ui.row().classes("items-center")
            ui.label(f"run {run_id}").classes("ss-small")
        phase = PhaseBar(median)

        with ui.row().classes("w-full flex-col xl:flex-row gap-6 items-start"):
            with ui.column().classes("w-full xl:w-[63%] gap-4"):
                canvas = SwarmCanvas()
                summary = RunSummary(
                    on_show_swarm=lambda: toggle_swarm(),
                    replay_href=f"/runs/{run_id}?replay=1&speed=20",
                )
            with ui.column().classes("w-full xl:w-[34%] gap-4"):
                request = InputRequest(run_id)
                profile = ProfileCard()
                with ui.element("div").classes("ss-card ss-card--tight w-full"):
                    with ui.tabs().props("dense no-caps").classes("w-full text-xs") as right_tabs:
                        activity_tab = ui.tab("Activity")
                        sources_tab = ui.tab("Sources")
                        graph_tab = ui.tab("Graph")
                        browser_tab = ui.tab("Browser")
                    with ui.tab_panels(right_tabs, value=activity_tab).classes("w-full"):
                        with ui.tab_panel(activity_tab):
                            activity = Activity()
                        with ui.tab_panel(sources_tab):
                            sources = SourcesPanel()
                        with ui.tab_panel(graph_tab):
                            graph = KnowledgeGraph()
                        with ui.tab_panel(browser_tab):
                            browser = LiveBrowser()

        errors = ui.column().classes("w-full gap-2")
        results = ui.column().classes("w-full gap-4").props("id=results")

    def toggle_swarm() -> None:
        state["collapsed"] = not state["collapsed"]
        canvas.set_collapsed(state["collapsed"])

    def refresh_header() -> None:
        display_name = (
            (view.report.profile.name if view.report else None)
            or view.student_name
            or run.get("student_name")
            or "Student"
        )
        name_label.text = display_name
        status_box.clear()
        with status_box:
            status_badge(view.status)

    def refresh_title() -> None:
        if view.finished:
            title = "✓ Results ready · ScholarSwarm"
        elif view.phase:
            index = PHASE_INDEX.get(view.phase, 0) + 1
            title = f"({index}/6) {view.phase.title()} · ScholarSwarm"
        else:
            title = "Live run · ScholarSwarm"
        if title != state["title"]:
            state["title"] = title
            ui.page_title(title)

    def render_results(report: FinalReport) -> None:
        results.clear()
        with results:
            with ui.row().classes("w-full items-center justify-between gap-2 flex-wrap"):
                ui.label("Results").classes("ss-h1")
                with ui.row().classes("items-center gap-1 ss-no-print"):
                    ui.button(
                        "Download report",
                        icon="download",
                        on_click=lambda: ui.download(
                            report_to_markdown(report).encode(), "report.md"
                        ),
                    ).props("flat no-caps")
                    ui.button(
                        "Print",
                        icon="print",
                        on_click=lambda: ui.run_javascript("window.print()"),
                    ).props("flat no-caps")
            with ui.tabs().classes("w-full") as tabs:
                top_tab = ui.tab("Top 5")
                all_tab = ui.tab("All opportunities")
                gaps_tab = ui.tab("Unlock more")
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

    def update_components() -> None:
        phase.update(view)
        canvas.update(view)
        summary.update(view)
        request.update(view)
        profile.update(view)
        activity.update(view)
        sources.update(view)
        browser.update(view)
        refresh_header()
        refresh_title()

    async def finish_if_ready() -> None:
        if not view.finished:
            return
        if view.report is None:
            fresh = await store.get_run(run_id)
            if fresh and fresh.get("report"):
                view.report = FinalReport.model_validate(fresh["report"])
                view.stats = view.report.stats
                view.status = fresh["status"]
            elif fresh and fresh["status"] == "failed":
                view.status = "failed"
                errors.clear()
                with errors:
                    with ui.element("div").classes("ss-card").style("border-color: var(--err)"):
                        ui.label("The run stopped").classes("ss-h2")
                        ui.label(fresh.get("error") or "Unknown error").classes("text-sm")
        if view.report:
            render_results(view.report)
        summary.update(view)
        refresh_header()
        if view.status == "failed" and view.report is None:
            canvas.set_collapsed(True)
        else:
            state["collapsed"] = True
            canvas.set_collapsed(True)

            async def scroll_results() -> None:
                await ui.run_javascript(
                    "document.getElementById('results')?.scrollIntoView({behavior:'smooth'})"
                )

            ui.timer(0.2, scroll_results, once=True)

    async def tick() -> None:
        changed: set[str] = set()
        for event in await store.events_after(run_id, view.last_event_id):
            changed |= reduce_event(view, event)
        if changed:
            update_components()
            if "graph" in changed:
                await graph.refresh(view)
        await finish_if_ready()
        if view.finished:
            timer.deactivate()

    timer = ui.timer(settings.ui_poll_seconds, tick)

    refresh_header()
    refresh_title()
    update_components()
    if view.graph_version:
        await graph.refresh(view)
    if view.interrupt:
        request.update(view)
    await finish_if_ready()
    if replay:
        ui.notify("Replay mode is coming in the next phase.", type="info")
