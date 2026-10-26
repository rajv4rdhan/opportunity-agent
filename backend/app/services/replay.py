"""Timed playback of stored events for demos and judging."""

from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
from datetime import datetime

from app.core import store
from app.models.events import Event

DEFAULT_CAP = 1.5


def replay_delays(
    timestamps: list[datetime], speed: float = 1.0, cap: float = DEFAULT_CAP
) -> list[float]:
    """Delay before each event: scaled gaps, with idle waits capped."""
    if not timestamps:
        return []
    factor = max(0.01, float(speed or 1.0))
    delays = [0.0]
    for previous, current in zip(timestamps, timestamps[1:]):
        gap = max(0.0, (current - previous).total_seconds()) / factor
        delays.append(min(gap, cap))
    return delays


async def replay_events(
    run_id: str, speed: float = 1.0, cap: float = DEFAULT_CAP
) -> AsyncIterator[Event]:
    """Yield every stored event in order, sleeping for the scaled gap."""
    events = await store.events_after(run_id, 0, 100_000)
    delays = replay_delays([event.ts for event in events], speed, cap)
    for event, delay in zip(events, delays):
        if delay:
            await asyncio.sleep(delay)
        yield event
