"""In-process event bus: persists events, counts stats, feeds subscribers."""

from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
from datetime import datetime, timezone

from app.core import store
from app.models.events import Event
from app.models.report import RunStats

_subscribers: dict[str, set[asyncio.Queue[Event]]] = {}
_stats: dict[str, RunStats] = {}


async def emit(
    run_id: str,
    type: str,
    message: str,
    agent: str | None = None,
    data: dict | None = None,
    **fields,
) -> Event:
    """Persist one event, update counters and push it to live subscribers.

    Both `emit(..., url=...)` and `emit(..., data={"url": ...})` produce flat data.
    """
    payload = {**(data or {}), **fields}
    event = Event(
        run_id=run_id,
        ts=datetime.now(timezone.utc),
        type=type,  # type: ignore[arg-type]
        agent=agent,
        message=message,
        data=payload,
    )
    event.id = await store.insert_event(event)
    _count(event)
    for queue in tuple(_subscribers.get(run_id, ())):
        queue.put_nowait(event)
    return event


async def subscribe(run_id: str, after_id: int = 0) -> AsyncIterator[Event]:
    """Replay stored events, then yield live ones. No gaps, no duplicates."""
    queue: asyncio.Queue[Event] = asyncio.Queue()
    _subscribers.setdefault(run_id, set()).add(queue)
    last_id = after_id
    try:
        for event in await store.events_after(run_id, after_id):
            last_id = event.id or last_id
            yield event
        while True:
            event = await queue.get()
            if (event.id or 0) > last_id:
                last_id = event.id or last_id
                yield event
    finally:
        queues = _subscribers.get(run_id)
        if queues is not None:
            queues.discard(queue)
            if not queues:
                _subscribers.pop(run_id, None)


def bump(run_id: str, **fields: float) -> None:
    """Accumulate counters that are not derived from events."""
    stats = _stats.setdefault(run_id, RunStats())
    for name, value in fields.items():
        setattr(stats, name, getattr(stats, name) + value)


def get_stats(run_id: str) -> RunStats:
    return _stats.get(run_id, RunStats()).model_copy(deep=True)


def reset_stats(run_id: str) -> None:
    _stats.pop(run_id, None)


def _count(event: Event) -> None:
    stats = _stats.setdefault(event.run_id, RunStats())
    if event.type == "agent_started":
        stats.agents_run += 1
    elif event.type == "tool_call":
        stats.tool_calls += 1
    elif event.type == "retry":
        stats.retries += 1
    elif event.type == "fallback":
        stats.fallbacks += 1
    elif event.type in {"tool_error", "agent_failed", "run_failed"}:
        stats.errors += 1
    pages = event.data.get("pages_read")
    if isinstance(pages, int):
        stats.pages_read += pages
