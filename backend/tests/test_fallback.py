from types import SimpleNamespace

import httpx
import pytest

from app.core import chaos
from app.core.fallback import AllProvidersFailed, first_success


@pytest.fixture
def events(monkeypatch):
    recorded: list[dict] = []

    async def fake_emit(run_id, type, message, agent=None, **data):
        recorded.append({"run_id": run_id, "type": type, "message": message, "data": data})

    monkeypatch.setattr("app.core.fallback.emit", fake_emit)
    monkeypatch.setattr("app.core.chaos.emit", fake_emit)
    chaos.reset()
    return recorded


def ctx(chaos_flags: dict | None = None):
    return SimpleNamespace(run_id="run-test", agent="tester", chaos=chaos_flags or {})


async def ok(value):
    return value


async def boom():
    raise RuntimeError("provider down")


async def test_second_provider_wins(events):
    result = await first_success(
        ctx(),
        "search",
        [("tavily", boom), ("exa", lambda: ok(["hit"]))],
    )
    assert result == ["hit"]
    assert any(event["type"] == "fallback" for event in events)
    assert any(event["type"] == "tool_result" for event in events)


async def test_all_providers_failed(events):
    with pytest.raises(AllProvidersFailed) as error:
        await first_success(ctx(), "search", [("tavily", boom), ("exa", boom)])
    assert len(error.value.errors) == 2
    assert any(event["type"] == "tool_error" for event in events)


async def test_empty_result_falls_back(events):
    result = await first_success(
        ctx(),
        "search",
        [("tavily", lambda: ok([])), ("exa", lambda: ok(["hit"]))],
    )
    assert result == ["hit"]
    assert any(event["type"] == "fallback" for event in events)


async def test_retry_on_429_then_success(events, monkeypatch):
    calls = {"count": 0}

    async def flaky():
        calls["count"] += 1
        if calls["count"] == 1:
            request = httpx.Request("GET", "https://example.com")
            raise httpx.HTTPStatusError(
                "429", request=request, response=httpx.Response(429, request=request)
            )
        return "ok"

    # Keep the test fast: the production policy uses 1s..4s backoff.
    monkeypatch.setattr("app.core.fallback.wait_exponential", lambda **_: 0)

    result = await first_success(ctx(), "fetch", [("jina", flaky)])
    assert result == "ok"
    assert calls["count"] == 2
    assert any(event["type"] == "retry" for event in events)


async def test_chaos_fires_once_per_run(events):
    calls = {"count": 0}

    async def provider():
        calls["count"] += 1
        return "ok"

    ctx_with_chaos = ctx({"search_primary_down": True})
    result = await first_success(
        ctx_with_chaos,
        "search",
        [("tavily", provider), ("exa", provider)],
    )
    assert result == "ok"
    assert calls["count"] == 1  # tavily was skipped by chaos
    assert any(event["type"] == "chaos_injected" for event in events)

    events.clear()
    result = await first_success(ctx_with_chaos, "search", [("tavily", provider)])
    assert result == "ok"
    assert not any(event["type"] == "chaos_injected" for event in events)
