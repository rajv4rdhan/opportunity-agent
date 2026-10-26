"""The parsed profile, shown as soon as the Profile Analyst finishes."""

from __future__ import annotations

import json

from nicegui import ui

from app.ui.live_state import RunView

TEST_LABELS = {
    "ielts": "IELTS",
    "toefl": "TOEFL",
    "pte": "PTE",
    "duolingo": "Duolingo",
    "gre": "GRE",
    "gmat": "GMAT",
}


def _join(values: list | None, empty: str = "—") -> str:
    return ", ".join(str(value) for value in (values or []) if value) or empty


def _money(value) -> str:
    try:
        return f"INR {int(value):,}/yr"
    except (TypeError, ValueError):
        return "—"


class ProfileCard:
    def __init__(self) -> None:
        self._signature: str | None = None
        self.container = ui.column().classes("w-full")
        self.container.set_visibility(False)

    def update(self, view: RunView) -> None:
        snapshot = view.profile_snapshot
        if not snapshot:
            return
        signature = json.dumps(snapshot, sort_keys=True, default=str)
        if signature == self._signature:
            return
        self._signature = signature
        self.container.clear()
        self.container.set_visibility(True)
        with self.container, ui.element("div").classes("ss-card ss-card--tight ss-fade-in w-full"):
            ui.label("What the agents understood").classes("ss-h2")
            ui.label("From your documents and description. Fix anything below before you apply.").classes(
                "ss-small"
            )
            with ui.grid(columns=2).classes("w-full gap-x-4 gap-y-1 mt-2"):
                for label, value in (
                    ("Degree", snapshot.get("current_degree") or snapshot.get("major")),
                    ("University", snapshot.get("university")),
                    (
                        "CGPA",
                        (
                            f"{snapshot.get('cgpa')}/{snapshot.get('cgpa_scale', 10):g}"
                            if snapshot.get("cgpa") is not None
                            else None
                        ),
                    ),
                    (
                        "Target",
                        " ".join(
                            part
                            for part in (
                                snapshot.get("target_degree"),
                                " / ".join(snapshot.get("target_fields") or []),
                            )
                            if part
                        )
                        or None,
                    ),
                    ("Countries", _join(snapshot.get("target_countries"))),
                    (
                        "Tests",
                        " · ".join(
                            f"{TEST_LABELS.get(key, key.upper())} {value}"
                            for key, value in (snapshot.get("test_scores") or {}).items()
                        )
                        or None,
                    ),
                    ("Budget", _money(snapshot.get("budget_inr_per_year")) if snapshot.get("budget_inr_per_year") else None),
                ):
                    if value:
                        ui.label(label).classes("ss-small")
                        ui.label(str(value)).classes("text-sm")

            skills = snapshot.get("skills") or []
            if skills:
                with ui.row().classes("flex-wrap gap-1 mt-2"):
                    for skill in skills[:8]:
                        ui.label(str(skill)).classes("ss-chip")

            projects = snapshot.get("projects") or []
            for source, title in (("resume", "From resume"), ("github", "Found on GitHub")):
                matches = [project for project in projects if project.get("source") == source]
                if not matches:
                    continue
                with ui.row().classes("items-center gap-1 mt-2"):
                    if source == "github":
                        ui.icon("code", size="14px")
                    ui.label(title).classes("ss-small")
                for project in matches[:5]:
                    ui.label(f"· {project.get('name')}").classes("text-sm")

            missing = []
            if not snapshot.get("cgpa"):
                missing.append("CGPA")
            if not snapshot.get("test_scores"):
                missing.append("test scores")
            if not snapshot.get("target_countries"):
                missing.append("target countries")
            if not snapshot.get("target_degree"):
                missing.append("target degree")
            if missing:
                ui.label("Not provided: " + ", ".join(missing)).classes("ss-small mt-1")
