"""Parallel verifier chips grouped by website domain."""

from __future__ import annotations

from nicegui import ui

from app.ui.live_state import RunView, worker_summary

MAX_VISIBLE = 14


class WorkerPool:
    def __init__(self, compact: bool = False) -> None:
        self.compact = compact
        self.max_visible = 6 if compact else MAX_VISIBLE
        self._signature: tuple | None = None
        self.container = ui.column().classes("w-full gap-1")
        self.update(None)

    def _signature_for(self, view: RunView | None) -> tuple:
        if view is None:
            return ()
        return tuple(
            (worker.key, worker.state, worker.message, worker.flash_until >= view.tick)
            for worker in view.workers.values()
        )

    def update(self, view: RunView | None) -> None:
        signature = self._signature_for(view)
        if signature == self._signature:
            return
        self._signature = signature
        self.container.clear()
        with self.container:
            if view is None or not view.workers:
                ui.label("Waiting for candidates").classes("ss-small")
                return
            counts = worker_summary(view)
            running = counts["fetching"] + counts["reading"]
            if self.compact:
                parts = [f"{running} running"]
                if counts["verified"]:
                    parts.append(f"{counts['verified']} ✓")
                if counts["rejected"]:
                    parts.append(f"{counts['rejected']} ✗")
                if counts["queued"]:
                    parts.append(f"{counts['queued']} queued")
            else:
                parts = [f"Verifiers · {running} running", f"{counts['verified']} verified"]
                if counts["rejected"]:
                    parts.append(f"{counts['rejected']} rejected")
                if counts["queued"]:
                    parts.append(f"{counts['queued']} queued")
                if counts["failed"]:
                    parts.append(f"{counts['failed']} failed")
            ui.label(" · ".join(parts)).classes("ss-small")
            with ui.element("div").classes("ss-worker-grid"):
                workers = list(view.workers.values())
                for worker in workers[: self.max_visible]:
                    modifier = worker.state
                    if worker.flash_until >= view.tick:
                        modifier = "is-fallback"
                    text = worker.domain or worker.key
                    if worker.state == "verified":
                        text = f"✓ {text}"
                    label = ui.label(text).classes(f"ss-worker is-{modifier}")
                    tooltip = "\n".join(
                        part
                        for part in (
                            worker.title,
                            worker.message,
                            worker.reason,
                            worker.url,
                        )
                        if part
                    )
                    if tooltip:
                        label.tooltip(tooltip)
                if len(workers) > self.max_visible:
                    ui.label(f"+{len(workers) - self.max_visible} more").classes("ss-worker-more")
