"""Live counters and the collapsed one-line run summary."""

from __future__ import annotations

from collections.abc import Callable

from nicegui import ui

from app.ui.live_state import RunView


def _duration(seconds: float) -> str:
    total = max(0, int(seconds))
    if total < 60:
        return f"{total}s"
    return f"{total // 60}m {total % 60:02d}s"


class RunSummary:
    def __init__(
        self,
        on_show_swarm: Callable[[], None] | None = None,
        replay_href: str | None = None,
    ) -> None:
        self.on_show_swarm = on_show_swarm
        self.replay_href = replay_href
        self._signature: tuple | None = None
        self.container = ui.element("div").classes("w-full")

    def _signature_for(self, view: RunView) -> tuple:
        stats = view.stats
        return (
            view.finished,
            view.status,
            stats.llm_calls,
            stats.tool_calls,
            stats.pages_read,
            stats.retries,
            stats.fallbacks,
            stats.errors,
            round(stats.est_cost_usd, 4),
            round(stats.duration_sec, 1),
            len(view.started_agents),
            sum(1 for worker in view.workers.values() if worker.state == "verified"),
        )

    def update(self, view: RunView) -> None:
        signature = self._signature_for(view)
        if signature == self._signature:
            return
        self._signature = signature
        self.container.clear()
        stats = view.stats
        recoveries = stats.retries + stats.fallbacks
        with self.container, ui.element("div").classes("ss-card ss-card--tight w-full"):
            if not view.finished:
                with ui.row().classes("w-full items-center gap-6 flex-wrap"):
                    for value, label in (
                        (stats.llm_calls, "LLM calls"),
                        (stats.pages_read, "pages read"),
                        (sum(1 for worker in view.workers.values() if worker.state == "verified"), "verified"),
                        (recoveries, "recoveries"),
                        (f"${stats.est_cost_usd:.3f}", "cost"),
                    ):
                        with ui.column().classes("ss-stat gap-0"):
                            ui.label(str(value)).classes("ss-stat-value text-base")
                            ui.label(label).classes("ss-stat-label")
                    if view.status == "waiting_input":
                        ui.label("Waiting for your input").classes("ss-pill is-waiting ml-auto")
                return

            with ui.row().classes("w-full items-center gap-3 flex-wrap"):
                verb = "finished" if view.status == "finished" else "stopped"
                ui.label(
                    f"Swarm {verb} in {_duration(stats.duration_sec)} · "
                    f"{len(view.started_agents)} agents · {stats.tool_calls} tool calls · "
                    f"{recoveries} automatic recoveries · ${stats.est_cost_usd:.3f}"
                ).classes("text-sm")
                with ui.row().classes("items-center gap-1 ml-auto"):
                    if self.on_show_swarm:
                        ui.button("Show swarm", icon="account_tree", on_click=self.on_show_swarm).props(
                            "flat dense no-caps"
                        )
                    if self.replay_href:
                        ui.button(
                            "Replay",
                            icon="replay",
                            on_click=lambda: ui.navigate.to(self.replay_href),
                        ).props("flat dense no-caps")
