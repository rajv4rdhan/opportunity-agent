"""Single source of UI metadata for the agent swarm."""

AGENTS = [
    {"id": "profile_analyst", "short": "Profile", "label": "Profile Analyst", "icon": "description", "x": 0, "y": 100},
    {"id": "clarifier", "short": "Clarifier", "label": "Clarifier", "icon": "help", "x": 220, "y": 0},
    {"id": "github_enricher", "short": "GitHub", "label": "GitHub Enricher", "icon": "code", "x": 220, "y": 200},
    {"id": "planner", "short": "Planner", "label": "Planner", "icon": "map", "x": 440, "y": 100},
    {"id": "scout", "short": "Scout", "label": "Scout", "icon": "travel_explore", "x": 660, "y": 100},
    {"id": "verifier", "short": "Verifiers", "label": "Verifiers (parallel)", "icon": "verified", "x": 880, "y": 100},
    {"id": "matcher", "short": "Matcher + KG", "label": "Matcher + Knowledge Graph", "icon": "hub", "x": 1100, "y": 100},
    {"id": "supervisor", "short": "Supervisor", "label": "Supervisor", "icon": "alt_route", "x": 1100, "y": 260},
    {"id": "ranker", "short": "Ranker", "label": "Ranker", "icon": "emoji_events", "x": 1320, "y": 100},
    {"id": "sop_writer", "short": "SOP", "label": "SOP Writer", "icon": "edit_note", "x": 1540, "y": 40},
    {"id": "critic", "short": "Critic", "label": "Critic", "icon": "rule", "x": 1540, "y": 180},
    {"id": "finalizer", "short": "Report", "label": "Report", "icon": "task", "x": 1760, "y": 100},
]

EDGES = [
    ("profile_analyst", "clarifier", False),
    ("profile_analyst", "github_enricher", False),
    ("clarifier", "github_enricher", False),
    ("github_enricher", "planner", False),
    ("planner", "scout", False),
    ("scout", "verifier", False),
    ("verifier", "matcher", False),
    ("matcher", "supervisor", False),
    ("supervisor", "planner", True),
    ("supervisor", "ranker", False),
    ("ranker", "sop_writer", False),
    ("sop_writer", "critic", False),
    ("critic", "sop_writer", True),
    ("critic", "finalizer", False),
]

STATUS_COLORS = {
    "idle": "#9ca3af",
    "running": "#3b82f6",
    "done": "#22c55e",
    "failed": "#ef4444",
    "skipped": "#d1d5db",
    "waiting": "#a855f7",
}

EVENT_STYLE = {
    "fallback": ("swap_horiz", "amber"),
    "retry": ("replay", "amber"),
    "chaos_injected": ("bolt", "orange"),
    "tool_error": ("error", "red"),
    "agent_failed": ("error", "red"),
    "run_failed": ("error", "red"),
    "decision": ("psychology", "purple"),
    "interrupt": ("help", "purple"),
    "opportunity_verified": ("check_circle", "green"),
    "opportunity_rejected": ("cancel", "grey"),
    "tool_call": ("build", "blue"),
    "tool_result": ("done", "blue"),
    "candidate_found": ("search", "blue"),
    "graph_update": ("hub", "green"),
    "browser_live_view": ("smartphone", "blue"),
    "agent_started": ("play_arrow", "blue"),
    "agent_finished": ("check", "green"),
    "agent_skipped": ("skip_next", "grey"),
    "log": ("notes", "grey"),
}

AGENT_BY_ID = {agent["id"]: agent for agent in AGENTS}
