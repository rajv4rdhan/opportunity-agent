"""Cloud browser (Kernel) with a local Playwright fallback and live view."""

from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any

from app.config import settings
from app.core.events import emit

if TYPE_CHECKING:
    from app.core.agent import AgentCtx

_playwright: Any = None
_playwright_lock = asyncio.Lock()
_local_browser: Any = None
_local_lock = asyncio.Lock()


@dataclass
class BrowserSession:
    browser: Any
    context: Any
    kernel: Any = None
    session_id: str | None = None
    live_url: str | None = None
    page_count: int = 0


_sessions: dict[str, BrowserSession] = {}
_session_locks: dict[str, asyncio.Lock] = {}


async def _get_playwright() -> Any:
    global _playwright
    async with _playwright_lock:
        if _playwright is None:
            from playwright.async_api import async_playwright

            _playwright = await async_playwright().start()
        return _playwright


async def _local() -> Any:
    global _local_browser
    async with _local_lock:
        if _local_browser is None or not _local_browser.is_connected():
            playwright = await _get_playwright()
            _local_browser = await playwright.chromium.launch(headless=True)
        return _local_browser


async def _open_session(ctx: "AgentCtx") -> BrowserSession:
    if settings.kernel_api_key:
        try:
            from kernel import AsyncKernel

            kernel = AsyncKernel(api_key=settings.kernel_api_key)
            created = await kernel.browsers.create(timeout_seconds=600)
            playwright = await _get_playwright()
            remote = await playwright.chromium.connect_over_cdp(created.cdp_ws_url)
            context = remote.contexts[0] if remote.contexts else await remote.new_context()
            live_url = getattr(created, "browser_live_view_url", None)
            if live_url:
                await emit(ctx.run_id, "browser_live_view", "Live browser ready", ctx.agent, url=live_url)
            return BrowserSession(
                browser=remote,
                context=context,
                kernel=kernel,
                session_id=getattr(created, "session_id", None),
                live_url=live_url,
            )
        except Exception as error:  # noqa: BLE001 - fall back to local chromium
            await emit(
                ctx.run_id,
                "fallback",
                f"Kernel browser unavailable ({error}); using local Chromium",
                ctx.agent,
                error=str(error),
            )

    local = await _local()
    context = await local.new_context()
    return BrowserSession(browser=local, context=context)


async def _session(ctx: "AgentCtx") -> BrowserSession:
    lock = _session_locks.setdefault(ctx.run_id, asyncio.Lock())
    async with lock:
        if ctx.run_id not in _sessions:
            _sessions[ctx.run_id] = await _open_session(ctx)
        return _sessions[ctx.run_id]


async def render_page(ctx: "AgentCtx", url: str) -> str:
    """Open the page in the run's browser and return the visible body text."""
    from playwright.async_api import TimeoutError as PlaywrightTimeoutError

    session = await _session(ctx)
    page = await session.context.new_page()
    try:
        try:
            await page.goto(url, wait_until="networkidle", timeout=30_000)
        except PlaywrightTimeoutError:
            await page.goto(url, wait_until="domcontentloaded", timeout=30_000)
            await page.wait_for_timeout(2_000)
        return await page.inner_text("body")
    finally:
        await page.close()


async def close_browser(run_id: str) -> None:
    session = _sessions.pop(run_id, None)
    if session is None:
        return
    try:
        if session.context is not None:
            await session.context.close()
        if session.kernel is not None and session.session_id:
            await session.kernel.browsers.delete_by_id(session.session_id)
            await session.kernel.close()
            if session.browser is not None:
                await session.browser.close()
        # The local Chromium instance is shared by every run in this process;
        # close_all() owns it, so do not shut it down when one run finishes.
    except Exception:  # noqa: BLE001 - cleanup must not fail a run
        pass
    finally:
        _session_locks.pop(run_id, None)


async def close_all() -> None:
    for run_id in list(_sessions):
        await close_browser(run_id)
    global _local_browser, _playwright
    async with _local_lock:
        if _local_browser is not None:
            try:
                await _local_browser.close()
            except Exception:  # noqa: BLE001
                pass
            _local_browser = None
    async with _playwright_lock:
        if _playwright is not None:
            try:
                await _playwright.stop()
            except Exception:  # noqa: BLE001
                pass
            _playwright = None
