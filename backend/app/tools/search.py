"""Multi-provider web search with ordered fallback."""

from __future__ import annotations

from typing import TYPE_CHECKING

from app.config import settings
from app.core.fallback import AllProvidersFailed, first_success
from app.core.http import http_post_json
from app.core.utils import is_official_domain
from app.models.opportunity import Candidate

if TYPE_CHECKING:
    from app.core.agent import AgentCtx


def _candidate(title: str, url: str, snippet: str, provider: str, query: str) -> Candidate:
    return Candidate(
        title=title or url,
        url=url,
        snippet=snippet or "",
        provider=provider,
        query=query,
        is_official_domain=is_official_domain(url),
    )


async def _tavily(query: str, limit: int) -> list[Candidate]:
    payload = {
        "query": query,
        "max_results": limit,
        "search_depth": "advanced",
        "include_answer": False,
    }
    data = await http_post_json(
        "https://api.tavily.com/search",
        payload,
        headers={"Authorization": f"Bearer {settings.tavily_api_key}"},
    )
    return [
        _candidate(item.get("title", ""), item.get("url", ""), item.get("content", ""), "tavily", query)
        for item in data.get("results", [])
        if item.get("url")
    ]


async def _exa(query: str, limit: int) -> list[Candidate]:
    payload = {
        "query": query,
        "numResults": limit,
        "type": "auto",
        "contents": {"text": {"maxCharacters": 1000}},
    }
    data = await http_post_json(
        "https://api.exa.ai/search",
        payload,
        headers={"x-api-key": settings.exa_api_key or ""},
    )
    return [
        _candidate(item.get("title", ""), item.get("url", ""), item.get("text", ""), "exa", query)
        for item in data.get("results", [])
        if item.get("url")
    ]


async def _serper(query: str, limit: int) -> list[Candidate]:
    payload = {"q": query, "num": limit}
    data = await http_post_json(
        "https://google.serper.dev/search",
        payload,
        headers={"X-API-KEY": settings.serper_api_key or ""},
    )
    return [
        _candidate(item.get("title", ""), item.get("link", ""), item.get("snippet", ""), "serper", query)
        for item in data.get("organic", [])
        if item.get("link")
    ]


async def web_search(ctx: "AgentCtx", query: str, max_results: int = 8) -> list[Candidate]:
    """Search Tavily → Exa → Serper, skipping providers without a key."""
    attempts = []
    if settings.tavily_api_key:
        attempts.append(("tavily", lambda: _tavily(query, max_results)))
    if settings.exa_api_key:
        attempts.append(("exa", lambda: _exa(query, max_results)))
    if settings.serper_api_key:
        attempts.append(("serper", lambda: _serper(query, max_results)))
    if not attempts:
        raise AllProvidersFailed("search", [("all", "no search provider keys configured")])
    return await first_success(ctx, "search", attempts)
