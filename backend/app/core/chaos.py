"""Chaos Mode: one-shot, visible failures used to demonstrate recovery."""

from __future__ import annotations

from app.core.events import emit

CHAOS_POINTS = {
    "search_primary_down": "search.tavily",
    "fetch_timeout": "fetch.jina",
    "llm_bad_json": "llm.first_call",
    "graph_db_down": "graph.neo4j",
    "github_rate_limited": "github.api",
}

CHAOS_DESCRIPTIONS = {
    "search_primary_down": "Tavily fails once → Exa/Serper take over",
    "fetch_timeout": "Jina times out once → Firecrawl/browser take over",
    "llm_bad_json": "First LLM call fails once → retry/fallback model",
    "graph_db_down": "Neo4j unreachable → in-memory graph",
    "github_rate_limited": "GitHub 403 once → unauthenticated retry",
}

_fired: dict[str, set[str]] = {}


class ChaosError(RuntimeError):
    """Raised when an injected failure fires."""


async def maybe_fail(run_id: str, chaos: dict, point: str) -> None:
    """If a chaos flag maps to this point and has not fired yet, raise once."""
    for flag, target in CHAOS_POINTS.items():
        if target != point or not chaos.get(flag):
            continue
        fired = _fired.setdefault(run_id, set())
        if point in fired:
            continue
        fired.add(point)
        await emit(
            run_id,
            "chaos_injected",
            f"Chaos Mode: {flag} fired at {point}",
            data={"flag": flag, "point": point},
        )
        raise ChaosError(f"Injected chaos at {point} ({flag})")


def reset(run_id: str | None = None) -> None:
    """Clear the fired set (used by tests and re-runs)."""
    if run_id is None:
        _fired.clear()
    else:
        _fired.pop(run_id, None)
