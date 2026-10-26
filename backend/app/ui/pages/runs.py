"""Run history with Open and Replay actions."""

from __future__ import annotations

from nicegui import ui

from app.core import store
from app.ui.components.badges import status_badge
from app.ui.theme import frame


def _duration(seconds: float) -> str:
    total = int(seconds or 0)
    if total <= 0:
        return "—"
    return f"{total // 60}m {total % 60:02d}s" if total >= 60 else f"{total}s"


@ui.page("/runs")
async def runs_page() -> None:
    runs = await store.list_runs(limit=100)
    with frame("History"):
        with ui.row().classes("w-full items-center justify-between gap-2"):
            with ui.column().classes("gap-0"):
                ui.label("History").classes("ss-h1")
                ui.label("Every search, with its duration and verified sources.").classes("ss-small")
            ui.button("New search", icon="add", on_click=lambda: ui.navigate.to("/")).props(
                "color=primary unelevated no-caps"
            )

        if not runs:
            with ui.element("div").classes("ss-card ss-empty w-full"):
                ui.label("No searches yet.").classes("text-base")
                ui.button("Start a search", on_click=lambda: ui.navigate.to("/")).props(
                    "flat no-caps"
                )
            return

        with ui.element("div").classes("ss-card ss-card--flush w-full"):
            with ui.row().classes(
                "w-full items-center gap-3 px-4 py-2 ss-small"
            ).style("border-bottom: 1px solid var(--border)"):
                ui.label("Student").classes("flex-1")
                ui.label("Started").classes("w-40 ss-history-meta")
                ui.label("Duration").classes("w-24 ss-history-meta")
                ui.label("Verified").classes("w-20")
                ui.label("Status").classes("w-28")
                ui.label("").classes("w-40")
            for run in runs:
                with ui.row().classes("w-full items-center gap-3 px-4 py-3").style(
                    "border-bottom: 1px solid var(--border)"
                ):
                    with ui.column().classes("gap-0 flex-1 min-w-0"):
                        ui.label(run.get("student_name") or "—").classes("text-sm font-medium")
                        ui.label(run["id"]).classes("ss-small")
                    ui.label((run.get("created_at") or "")[:16].replace("T", " ")).classes(
                        "ss-small w-40 ss-history-meta"
                    )
                    ui.label(_duration(run.get("duration_sec"))).classes(
                        "ss-small w-24 ss-history-meta ss-mono"
                    )
                    ui.label(str(run.get("verified_count") or 0)).classes("text-sm w-20 ss-mono")
                    with ui.row().classes("w-28"):
                        status_badge(run["status"])
                    with ui.row().classes("w-40 justify-end gap-1"):
                        ui.button(
                            "Open",
                            on_click=lambda _, target=run["id"]: ui.navigate.to(f"/runs/{target}"),
                        ).props("flat dense no-caps")
                        replay = ui.button(
                            "Replay",
                            on_click=lambda _, target=run["id"]: ui.navigate.to(
                                f"/runs/{target}?replay=1&speed=20"
                            ),
                        ).props("flat dense no-caps")
                        replay.set_enabled(run["status"] in {"finished", "failed"})
