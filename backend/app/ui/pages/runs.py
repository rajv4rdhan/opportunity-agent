"""Run history page."""

from __future__ import annotations

from nicegui import ui

from app.core import store
from app.ui.components.badges import status_badge
from app.ui.theme import frame

COLUMNS = [
    {"name": "created_at", "label": "Started", "field": "created_at", "align": "left", "sortable": True},
    {"name": "student_name", "label": "Student", "field": "student_name", "align": "left", "sortable": True},
    {"name": "status", "label": "Status", "field": "status", "align": "left", "sortable": True},
    {"name": "id", "label": "Run id", "field": "id", "align": "left"},
]


@ui.page("/runs")
async def runs_page() -> None:
    runs = await store.list_runs(limit=100)
    with frame("History"):
        ui.label("Run history").classes("text-2xl font-bold")
        if not runs:
            ui.label("No runs yet. Start one from New search.").classes("text-sm text-gray-500")
            return

        rows = [
            {
                "id": run["id"],
                "created_at": (run["created_at"] or "")[:19].replace("T", " "),
                "student_name": run["student_name"] or "—",
                "status": run["status"],
            }
            for run in runs
        ]
        table = ui.table(columns=COLUMNS, rows=rows, row_key="id").classes("w-full")
        with ui.row().classes("gap-2 items-center"):
            for status in ("queued", "running", "waiting_input", "finished", "failed"):
                status_badge(status)
        ui.label("Click a row to open the run.").classes("text-xs text-gray-500")

        def open_row(event) -> None:
            args = event.args
            row = args[1] if isinstance(args, list) and len(args) > 1 else args
            if isinstance(row, dict) and row.get("id"):
                ui.navigate.to(f"/runs/{row['id']}")

        table.on("rowClick", open_row)
