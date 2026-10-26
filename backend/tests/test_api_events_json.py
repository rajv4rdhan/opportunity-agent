"""The events.json endpoint powers replay and the E2E fixtures."""

from __future__ import annotations

from datetime import datetime, timezone

import httpx
import pytest

from app.config import settings
from app.core import store
from app.main import app
from app.models.events import Event


@pytest.fixture(autouse=True)
async def isolated_store(monkeypatch, tmp_path):
    monkeypatch.setattr(settings, "data_dir", tmp_path)
    monkeypatch.setattr(store, "_initialized", False)
    await store.init_db()


async def test_events_json_returns_stored_events_in_order():
    await store.create_run("events1", "Test Student", {"form": {}}, status="finished")
    for index, kind in enumerate(("run_started", "agent_started", "run_finished"), start=1):
        await store.insert_event(
            Event(
                run_id="events1",
                ts=datetime(2026, 10, 26, 12, index, tzinfo=timezone.utc),
                type=kind,
                agent="planner" if kind == "agent_started" else None,
                message=kind,
            )
        )

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/runs/events1/events.json")

    assert response.status_code == 200
    events = response.json()
    assert [event["type"] for event in events] == [
        "run_started",
        "agent_started",
        "run_finished",
    ]
    assert [event["id"] for event in events] == sorted(event["id"] for event in events)
    assert events[1]["agent"] == "planner"


async def test_events_json_404s_for_unknown_run():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/runs/missing/events.json")

    assert response.status_code == 404
    assert response.json()["detail"] == "Run not found"
