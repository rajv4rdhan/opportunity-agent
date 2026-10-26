"""Swarm canvas: nodes, animated hand-off edges and the parallel verifier pool."""

from __future__ import annotations

import json

from nicegui import ui

from app.ui.agents import AGENTS, AGENT_BY_ID, EDGES
from app.ui.components.worker_pool import WorkerPool
from app.ui.live_state import RunView

W, H = 1200, 440
COL, ROW = 200, 140
LEFT, TOP = 8, 30
NODE_W, NODE_H = 184, 64
SPAN = 3

NODE_STYLE = {
    "running": ("autorenew", "running"),
    "done": ("check_circle", "done"),
    "failed": ("error", "failed"),
    "skipped": ("remove_circle_outline", "skipped"),
    "waiting": ("pan_tool", "waiting"),
    "idle": ("circle", "idle"),
}


def _y_center(agent: dict) -> float:
    if agent.get("span"):
        return TOP + (0.7818 * H) / 2
    return TOP + agent["row"] * ROW + NODE_H / 2


def _path(source: dict, target: dict, loop: bool) -> tuple[str, tuple[float, float]]:
    """Cubic Bezier path and a point for its label."""
    if source["col"] == target["col"]:
        center = LEFT + source["col"] * COL + NODE_W / 2
        upwards = target["row"] < source["row"]
        source_y = TOP + source["row"] * ROW + (0 if upwards else NODE_H)
        target_y = TOP + target["row"] * ROW + (NODE_H if upwards else 0)
        offset = 88 if loop else 54
        middle = (source_y + target_y) / 2
        path = (
            f"M {center} {source_y} "
            f"C {center + offset} {source_y}, {center + offset} {target_y}, {center} {target_y}"
        )
        return path, (center + offset * 0.65, middle)

    source_x = LEFT + source["col"] * COL + NODE_W
    target_x = LEFT + target["col"] * COL
    source_y = _y_center(source)
    target_y = _y_center(target)
    bend = 60
    path = (
        f"M {source_x} {source_y} "
        f"C {source_x + bend} {source_y}, {target_x - bend} {target_y}, {target_x} {target_y}"
    )
    return path, ((source_x + target_x) / 2, (source_y + target_y) / 2)


def _edge_svg() -> str:
    paths = []
    for source, target, loop in EDGES:
        path, _point = _path(AGENT_BY_ID[source], AGENT_BY_ID[target], loop)
        classes = "ss-edge" + (" is-loop" if loop else "")
        paths.append(
            f'<path id="edge-{source}-{target}" class="{classes}" d="{path}" '
            'vector-effect="non-scaling-stroke"></path>'
        )
    return (
        f'<svg viewBox="0 0 {W} {H}" width="100%" height="100%" '
        'preserveAspectRatio="none" aria-hidden="true" '
        'style="position:absolute;inset:0;width:100%;height:100%">'
        + "".join(paths)
        + "</svg>"
    )


def _edge_label_point(source: str, target: str) -> tuple[float, float]:
    for a, b, loop in EDGES:
        if a == source and b == target:
            _path_value, point = _path(AGENT_BY_ID[a], AGENT_BY_ID[b], loop)
            return point[0] / W * 100, point[1] / H * 100
    return 50.0, 50.0


def _node_position(agent: dict) -> tuple[float, float]:
    return (
        (LEFT + agent["col"] * COL) / W * 100,
        (TOP + agent["row"] * ROW) / H * 100,
    )


class SwarmCanvas:
    def __init__(self) -> None:
        self._active: set[tuple[str, str]] = set()
        self._label_signature: tuple | None = None
        self._mobile_signature: tuple | None = None
        self._callout_until = 0
        self._callout_text = ""
        self.nodes: dict[str, dict] = {}
        self.mobile_nodes: dict[str, dict] = {}
        self.worker_pool: WorkerPool | None = None
        self.mobile_pool: WorkerPool | None = None
        self._visible = True

        self.card = ui.element("div").classes("ss-card w-full").style("padding: 16px")
        with self.card:
            self.desktop = ui.element("div").classes("ss-canvas-wrap ss-desktop-only")
            with self.desktop:
                ui.html(_edge_svg(), sanitize=False).classes("ss-canvas-bg")
                self.callout = ui.label("").classes("ss-callout")
                self.callout.set_visibility(False)
                self.labels = ui.element("div").classes("ss-canvas-bg").style(
                    "pointer-events: none;"
                )
                for agent in AGENTS:
                    self._build_node(agent)
            self.mobile = ui.element("div").classes("ss-mobile-only ss-timeline mt-1")
            with self.mobile:
                for agent in AGENTS:
                    self._build_mobile_node(agent)
                self.mobile_pool = WorkerPool()
        self.update(None)

    def _build_node(self, agent: dict) -> None:
        left, top = _node_position(agent)
        classes = "ss-node is-idle" + (" is-tall is-verifier" if agent.get("span") else "")
        node = ui.element("div").classes(classes).style(
            f"left: {left:.3f}%; top: {top:.3f}%;"
        ).tooltip(agent["role"])
        with node:
            with ui.row().classes("w-full items-start gap-2 no-wrap"):
                with ui.element("div").classes("ss-node-icon"):
                    ui.icon(agent["icon"], size="16px")
                with ui.column().classes("ss-node-body gap-0"):
                    ui.label(agent["short"]).classes("ss-node-name")
                    ui.label(agent["role"]).classes("ss-node-role")
                    thought = ui.label("").classes("ss-node-thought")
                status = ui.icon("circle", size="13px").classes("ss-node-status")
            if agent["id"] == "verifier":
                self.worker_pool = WorkerPool(compact=True)
        self.nodes[agent["id"]] = {
            "element": node,
            "thought": thought,
            "status": status,
        }

    def _build_mobile_node(self, agent: dict) -> None:
        with ui.element("div").classes("ss-timeline-row"):
            ui.icon(agent["icon"], size="18px").classes("mt-0.5")
            with ui.column().classes("gap-0 flex-1 min-w-0"):
                with ui.row().classes("items-center gap-2"):
                    ui.label(agent["label"]).classes("text-sm font-medium")
                    badge = ui.label("idle").classes("ss-pill is-idle")
                thought = ui.label("").classes("ss-small truncate")
        self.mobile_nodes[agent["id"]] = {"badge": badge, "thought": thought}

    def _set_visible(self, visible: bool) -> None:
        self._visible = visible
        self.card.set_visibility(visible)

    def update(self, view: RunView | None) -> None:
        if view is None:
            return
        for agent in AGENTS:
            agent_id = agent["id"]
            status = view.agent_status.get(agent_id, "idle")
            refs = self.nodes[agent_id]
            element = refs["element"]
            element.classes(
                remove="is-idle is-running is-done is-failed is-skipped is-waiting"
            )
            element.classes(add=f"is-{status}")
            thought = view.thoughts.get(agent_id, "")
            refs["thought"].text = thought or agent["role"]
            icon, _ = NODE_STYLE.get(status, NODE_STYLE["idle"])
            refs["status"].name = icon
            refs["status"].classes(remove="ss-spin")
            if status == "running":
                refs["status"].classes(add="ss-spin")

            mobile = self.mobile_nodes[agent_id]
            mobile["badge"].text = status.replace("_", " ")
            mobile["badge"].classes(
                remove="is-idle is-running is-done is-failed is-skipped is-waiting"
            )
            mobile["badge"].classes(add=f"is-{status}")
            mobile["thought"].text = thought or agent["role"]

        self._update_edges(view)
        self._update_labels(view)
        self._update_callout(view)
        if self.worker_pool:
            self.worker_pool.update(view)
        if self.mobile_pool:
            self.mobile_pool.update(view)

    def _update_edges(self, view: RunView) -> None:
        changed_on = view.active_edges - self._active
        changed_off = self._active - view.active_edges
        self._active = set(view.active_edges)
        if not changed_on and not changed_off:
            return
        on_ids = [f"edge-{a}-{b}" for a, b in changed_on]
        off_ids = [f"edge-{a}-{b}" for a, b in changed_off]
        ui.run_javascript(
            f"for (const id of {json.dumps(on_ids)}) "
            "document.getElementById(id)?.classList.add('is-active');"
            f"for (const id of {json.dumps(off_ids)}) "
            "document.getElementById(id)?.classList.remove('is-active');"
        )

    def _update_labels(self, view: RunView) -> None:
        visible = [
            handoff
            for handoff in view.handoffs[-6:]
            if handoff.label and (handoff.src, handoff.dst) in view.active_edges
        ][-2:]
        signature = tuple(
            (handoff.src, handoff.dst, handoff.label, handoff.at_event_id) for handoff in visible
        )
        if signature == self._label_signature:
            return
        self._label_signature = signature
        self.labels.clear()
        with self.labels:
            for handoff in visible:
                left, top = _edge_label_point(handoff.src, handoff.dst)
                ui.label(handoff.label).classes("ss-edge-label").style(
                    f"left: {left:.2f}%; top: {top:.2f}%;"
                )

    def _update_callout(self, view: RunView) -> None:
        if view.events:
            last = view.events[-1]
            if last.type == "decision" and last.agent == "supervisor":
                self._callout_text = " ".join(last.message.split())[:90]
                self._callout_until = view.tick + 8
        if self._callout_text and view.tick <= self._callout_until:
            self.callout.text = self._callout_text
            self.callout.set_visibility(True)
            left, top = _node_position(AGENT_BY_ID["supervisor"])
            self.callout.style(f"left: {left + 14:.2f}%; top: {top + 12:.2f}%;")
        else:
            self.callout.set_visibility(False)

    def set_collapsed(self, collapsed: bool) -> None:
        self._set_visible(not collapsed)
