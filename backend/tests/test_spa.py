"""The FastAPI app serves the built React SPA and keeps API 404s JSON."""

from __future__ import annotations

import httpx
import pytest

import app.main as main_module


@pytest.fixture
def dist(tmp_path, monkeypatch):
    folder = tmp_path / "dist"
    assets = folder / "assets"
    assets.mkdir(parents=True)
    (folder / "index.html").write_text("<!doctype html><div id=root>ScholarSwarm</div>")
    (folder / "favicon.svg").write_text("<svg></svg>")
    (assets / "app.js").write_text("console.log('ok')")
    monkeypatch.setattr(main_module, "FRONTEND_DIST", folder)
    return folder


async def _client(app):
    transport = httpx.ASGITransport(app=app)
    return httpx.AsyncClient(transport=transport, base_url="http://test")


async def test_root_and_deep_links_return_the_spa(dist):
    app = main_module.create_app()
    async with await _client(app) as client:
        root = await client.get("/")
        deep = await client.get("/runs/abc")

    assert root.status_code == 200
    assert "ScholarSwarm" in root.text
    assert deep.status_code == 200
    assert "ScholarSwarm" in deep.text
    assert deep.headers["cache-control"] == "no-cache"


async def test_static_files_are_served_and_api_404_is_json(dist):
    app = main_module.create_app()
    async with await _client(app) as client:
        icon = await client.get("/favicon.svg")
        asset = await client.get("/assets/app.js")
        missing = await client.get("/api/nope")

    assert icon.status_code == 200
    assert asset.status_code == 200
    assert asset.text == "console.log('ok')"
    assert missing.status_code == 404
    assert missing.json() == {"detail": "Not Found"}


async def test_missing_build_returns_a_helpful_message(tmp_path, monkeypatch):
    missing = tmp_path / "missing"
    monkeypatch.setattr(main_module, "FRONTEND_DIST", missing)
    app = main_module.create_app()
    async with await _client(app) as client:
        response = await client.get("/")

    assert response.status_code == 200
    assert "Frontend not built" in response.text
    assert "npm run build" in response.text
