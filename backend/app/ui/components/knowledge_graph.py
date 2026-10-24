"""Force-directed knowledge-graph view (Neo4j or in-memory backend)."""

from __future__ import annotations

from nicegui import ui

from app.tools.graph_store import open_readonly_store
from app.ui.live_state import RunView

TYPE_COLORS = {
    "Student": "#4f46e5",
    "Opportunity": "#0ea5e9",
    "Skill": "#22c55e",
    "Project": "#f59e0b",
    "Requirement": "#ef4444",
    "Organization": "#8b5cf6",
    "Country": "#14b8a6",
    "Source": "#64748b",
}


def _options(data: dict) -> dict:
    nodes = data.get("nodes", [])
    types = sorted({node.get("type", "Node") for node in nodes}) or ["Node"]
    categories = [{"name": node_type} for node_type in types]
    index = {node_type: position for position, node_type in enumerate(types)}
    chart_nodes = [
        {
            "name": node["id"],
            "category": index.get(node.get("type", "Node"), 0),
            "symbolSize": 26 if node.get("type") in {"Student", "Opportunity"} else 14,
            "value": node.get("label", node["id"]),
            "label": {
                "show": node.get("type") in {"Student", "Opportunity"},
                "formatter": (
                    (node.get("label", node["id"])[:22] + "…")
                    if len(node.get("label", node["id"])) > 23
                    else node.get("label", node["id"])
                ),
                "fontSize": 10,
            },
        }
        for node in nodes[:300]
    ]
    chart_links = []
    for link in data.get("links", [])[:300]:
        rel = link.get("type", "")
        color = "#22c55e" if rel == "MEETS" else "#ef4444" if rel == "MISSES" else "#cbd5e1"
        chart_links.append(
            {
                "source": link["source"],
                "target": link["target"],
                "value": rel,
                "lineStyle": {"color": color, "width": 1.2},
            }
        )
    return {
        "tooltip": {"formatter": "{c}"},
        "legend": [{"data": [category["name"] for category in categories], "bottom": 0}],
        "series": [
            {
                "type": "graph",
                "layout": "force",
                "roam": True,
                "draggable": True,
                "categories": categories,
                "data": chart_nodes,
                "links": chart_links,
                "force": {"repulsion": 260, "edgeLength": 120, "gravity": 0.08},
                "itemStyle": {"borderColor": "#fff", "borderWidth": 1},
                "emphasis": {"focus": "adjacency"},
                "color": [TYPE_COLORS.get(node_type, "#94a3b8") for node_type in types],
            }
        ],
    }


class KnowledgeGraph:
    def __init__(self) -> None:
        self.chart = ui.echart(_options({"nodes": [], "links": []})).style("width: 100%; height: 440px")
        self.note = ui.label(
            "No graph data yet. Nodes appear as the Matcher writes them."
        ).classes("text-xs text-gray-500")
        self._version = -1

    async def refresh(self, view: RunView) -> None:
        if view.graph_version == self._version:
            return
        self._version = view.graph_version
        graph = await open_readonly_store()
        data = await graph.export(view.run_id)
        self.chart.options.clear()
        self.chart.options.update(_options(data))
        self.chart.update()
        if data.get("nodes"):
            self.note.text = (
                f"{len(data['nodes'])} nodes, {len(data.get('links', []))} links · "
                "green = meets, red = misses"
            )
        else:
            self.note.text = (
                "No graph data in this process. The in-memory graph does not survive a restart; "
                "configure Neo4j to persist it."
            )
