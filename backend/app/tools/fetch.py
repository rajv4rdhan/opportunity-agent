"""Page fetching: cache → Jina → Firecrawl → cloud/local browser."""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from typing import TYPE_CHECKING, Literal

from app.config import settings
from app.core import store
from app.core.events import emit
from app.core.fallback import AllProvidersFailed, first_success
from app.core.http import http_get_text, http_post_json
from app.core.utils import normalize_url, truncate
from app.tools import browser

if TYPE_CHECKING:
    from app.core.agent import AgentCtx

BLOCK_MARKERS = (
    "access denied",
    "enable javascript",
    "captcha",
    "verify you are human",
    "just a moment",
    "cloudflare",
    "unusual traffic",
)


@dataclass
class PageContent:
    url: str
    final_url: str
    text: str
    method: Literal["jina", "firecrawl", "browser", "cache", "search_snippet"]


def _cache_key(url: str) -> str:
    return "page:" + hashlib.sha256(normalize_url(url).encode()).hexdigest()


def _usable(text: str) -> bool:
    if not text or len(text.strip()) < 500:
        return False
    lowered = text.lower()
    return not any(marker in lowered for marker in BLOCK_MARKERS)


async def _from_cache(url: str) -> PageContent | None:
    raw = await store.cache_get(_cache_key(url))
    if not raw:
        return None
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return None
    return PageContent(
        url=url,
        final_url=data.get("final_url", url),
        text=data["text"],
        method="cache",
    )


async def _save_cache(url: str, text: str, final_url: str, method: str) -> None:
    payload = json.dumps({"text": text, "final_url": final_url, "method": method})
    await store.cache_set(_cache_key(url), payload)


async def _jina(url: str) -> str:
    headers = {"X-Return-Format": "markdown"}
    if settings.jina_api_key:
        headers["Authorization"] = f"Bearer {settings.jina_api_key}"
    return await http_get_text(f"https://r.jina.ai/{url}", headers=headers, cache=False)


async def _firecrawl(url: str) -> str:
    data = await http_post_json(
        "https://api.firecrawl.dev/v1/scrape",
        {"url": url, "formats": ["markdown"], "onlyMainContent": True},
        headers={"Authorization": f"Bearer {settings.firecrawl_api_key}"},
        cache=False,
    )
    return (data.get("data") or {}).get("markdown", "")


async def fetch_page(ctx: "AgentCtx", url: str) -> PageContent:
    """Fetch a page with visible fallbacks. Raises AllProvidersFailed if blocked."""
    cached = await _from_cache(url)
    if cached is not None:
        await emit(
            ctx.run_id, "log", f"Served {url} from cache ({len(cached.text)} chars)", ctx.agent,
            url=url, pages_read=1, method="cache",
        )
        return cached

    used = {"method": "jina"}

    async def jina() -> str:
        used["method"] = "jina"
        return await _jina(url)

    async def firecrawl() -> str:
        used["method"] = "firecrawl"
        return await _firecrawl(url)

    async def rendered() -> str:
        used["method"] = "browser"
        return await browser.render_page(ctx, url)

    attempts = [("jina", jina)]
    if settings.firecrawl_api_key:
        attempts.append(("firecrawl", firecrawl))
    attempts.append(("browser", rendered))

    text = await first_success(
        ctx,
        "fetch",
        attempts,
        retries_each=2,
        is_empty=lambda value: not _usable(value or ""),
    )
    text = truncate(text, settings.page_char_limit)
    method = used["method"]
    await _save_cache(url, text, url, method)
    await emit(
        ctx.run_id, "log", f"Fetched {url} via {method} ({len(text)} chars)", ctx.agent,
        url=url, pages_read=1, method=method,
    )
    return PageContent(url=url, final_url=url, text=text, method=method)  # type: ignore[arg-type]


async def fetch_or_none(ctx: "AgentCtx", url: str) -> PageContent | None:
    try:
        return await fetch_page(ctx, url)
    except AllProvidersFailed:
        return None
