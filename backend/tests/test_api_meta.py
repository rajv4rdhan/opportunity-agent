"""Contract tests for /api/meta and the typed run endpoints."""

from __future__ import annotations

import httpx
import pytest

import app.api.meta as meta_module
from app.config import settings
from app.core import store
from app.main import app


@pytest.fixture(autouse=True)
async def isolated_store(monkeypatch, tmp_path):
    monkeypatch.setattr(settings, "data_dir", tmp_path)
    monkeypatch.setattr(store, "_initialized", False)
    monkeypatch.setattr(meta_module, "resolve_token", lambda: "test-token")
    await store.init_db()


@pytest.fixture
async def client():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as http:
        yield http


async def test_meta_shape_and_samples(client):
    response = await client.get("/api/meta")

    assert response.status_code == 200
    body = response.json()
    assert set(body) == {"providers", "samples", "chaos_points", "median_duration_sec"}
    assert body["providers"]["llm"] is True
    assert body["providers"]["github"] is True
    names = [sample["name"] for sample in body["samples"]]
    assert "rahul" in names
    rahul = next(sample for sample in body["samples"] if sample["name"] == "rahul")
    assert rahul["description"].strip()
    assert rahul["form"]["target_degree"]
    assert len(body["chaos_points"]) == 5
    assert all(point["label"] and point["caption"] for point in body["chaos_points"])
    assert body["median_duration_sec"] is None


async def test_runs_use_nullable_duration_and_verified_count(client, monkeypatch):
    await store.create_run("pending1", "Pending Student", {"form": {}}, status="running")

    response = await client.get("/api/runs")

    assert response.status_code == 200
    run = response.json()[0]
    assert run["id"] == "pending1"
    assert run["duration_sec"] is None
    assert run["verified_count"] is None
