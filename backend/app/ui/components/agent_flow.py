"""ECharts graph of the agent swarm with live status colours."""

from __future__ import annotations

from nicegui import ui

from app.ui.agents import AGENTS, EDGES, STATUS_COLORS
from app.ui.live_state import RunView


def _options(view: RunView | None) -> dict:
    statuses = view.agent_status if view else {}
    data = []
    for agent in AGENTS:
        status = statuses.get(agent["id"], "idle")
        label = agent.get("short", agent["label"])
        if agent["id"] == "verifier" and view is not None:
            label = f"Verifiers {view.verifiers_done}/{view.verifiers_started}"
        data.append(
            {
                "name": agent["label"],
                "x": 40 + agent["x"] * 0.42,
                "y": 40 + agent["y"] * 0.75,
                "symbolSize": 52 if status == "running" else 40,
                "itemStyle": {"color": STATUS_COLORS.get(status, STATUS_COLORS["idle"])},
                "label": {
                    "show": True,
                    "formatter": label,
                    "fontSize": 9,
                    "color": "#334155",
                    "position": "bottom",
                    "distance": 4,
                },
            }
        )
    links = [
        {
            "source": source,
            "target": target,
            "lineStyle": {
                "color": "#94a3b8",
                "width": 1.2,
                "type": "dashed" if loop else "solid",
                "curveness": 0.25 if loop else 0.0,
            },
        }
        for source, target, loop in EDGES
    ]
    return {
        "tooltip": {},
        "animationDurationUpdate": 300,
        "series": [
            {
                "type": "graph",
                "layout": "none",
                "roam": True,
                "draggable": True,
                "edgeSymbol": ["none", "arrow"],
                "edgeSymbolSize": 6,
                "data": data,
                "links": links,
                "label": {"position": "bottom"},
                "lineStyle": {"color": "#94a3b8"},
            }
        ],
    }


class AgentFlow:
    def __init__(self) -> None:
        self.chart = ui.echart(_options(None)).style("width: 100%; height: 340px")

    def update(self, view: RunView) -> None:
        self.chart.options.clear()
        self.chart.options.update(_options(view))
        self.chart.update()
