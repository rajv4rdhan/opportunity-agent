"""The ONLY outbound HTTP client. Caching and headers live here, retries do not."""

from __future__ import annotations

import asyncio
import hashlib
import json as jsonlib
from typing import Any

import httpx

from app.config import settings
from app.core import store

_client: httpx.AsyncClient | None = None
_client_lock = asyncio.Lock()
USER_AGENT = "ScholarSwarm/1.0 (research bot)"


async def get_client() -> httpx.AsyncClient:
    global _client
    async with _client_lock:
        if _client is None or _client.is_closed:
            _client = httpx.AsyncClient(
                timeout=30,
                follow_redirects=True,
                headers={"User-Agent": USER_AGENT},
            )
        return _client


async def close_http() -> None:
    global _client
    async with _client_lock:
        if _client is not None:
            await _client.aclose()
            _client = None


def _cache_key(method: str, url: str, body: str = "") -> str:
    raw = f"{method.upper()}|{url}|{body}".encode()
    return hashlib.sha256(raw).hexdigest()


async def http_get_text(url: str, headers: dict[str, str] | None = None, cache: bool = True) -> str:
    key = _cache_key("GET", url)
    if cache:
        cached = await store.cache_get(key)
        if cached is not None:
            return cached
    client = await get_client()
    response = await client.get(url, headers=headers)
    response.raise_for_status()
    text = response.text
    if cache:
        await store.cache_set(key, text)
    return text


async def http_get_json(url: str, headers: dict[str, str] | None = None, cache: bool = True) -> Any:
    key = _cache_key("GET", url)
    if cache:
        cached = await store.cache_get(key)
        if cached is not None:
            return jsonlib.loads(cached)
    client = await get_client()
    response = await client.get(url, headers=headers)
    response.raise_for_status()
    if cache:
        await store.cache_set(key, response.text)
    return response.json()


async def http_post_json(
    url: str,
    json: dict | None = None,
    headers: dict[str, str] | None = None,
    cache: bool = True,
) -> Any:
    body = jsonlib.dumps(json or {}, sort_keys=True)
    key = _cache_key("POST", url, body)
    if cache:
        cached = await store.cache_get(key)
        if cached is not None:
            return jsonlib.loads(cached)
    client = await get_client()
    response = await client.post(url, json=json, headers=headers)
    response.raise_for_status()
    if cache:
        await store.cache_set(key, response.text)
    return response.json()


def ttl_hours() -> int:
    return settings.cache_ttl_hours
