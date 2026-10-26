"""CORS contract tests for the Pages-hosted frontend."""

from __future__ import annotations

import httpx
import pytest

from app.config import Settings
from app.main import app

PAGES_ORIGIN = "https://opportunity-agent.pages.dev"


@pytest.fixture
async def client():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as http:
        yield http


def test_cors_origins_are_normalized():
    configured = Settings(cors_origins="https://example.com/, https://other.example")

    assert configured.cors_origin_list == ["https://example.com", "https://other.example"]


async def test_preflight_from_pages_origin(client):
    response = await client.options(
        "/api/runs",
        headers={
            "Origin": PAGES_ORIGIN,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == PAGES_ORIGIN
    assert "POST" in response.headers["access-control-allow-methods"]


async def test_simple_request_from_pages_origin(client):
    response = await client.get("/api/health", headers={"Origin": PAGES_ORIGIN})

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == PAGES_ORIGIN


async def test_unknown_origin_gets_no_cors_header(client):
    response = await client.get("/api/health", headers={"Origin": "https://evil.example"})

    assert response.status_code == 200
    assert "access-control-allow-origin" not in response.headers
