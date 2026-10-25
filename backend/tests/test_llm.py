"""LLM chaos recovery without calling a real model."""

from types import SimpleNamespace

from app.config import settings
from app.core import llm, store
from app.core.agent import AgentCtx


async def test_chaos_first_call_retries_the_same_model(monkeypatch, tmp_path):
    monkeypatch.setattr(settings, "data_dir", tmp_path)
    monkeypatch.setattr(store, "_initialized", False)
    monkeypatch.setattr(settings, "model_fast", "fake-model")
    monkeypatch.setattr(settings, "model_fallback", "fake-model")

    calls = {"count": 0}

    async def fake_completion(**kwargs):
        calls["count"] += 1
        return SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(content="OK"))],
            usage=None,
        )

    monkeypatch.setattr(llm.litellm, "acompletion", fake_completion)

    ctx = AgentCtx(run_id="llm-chaos-test", agent="profile_analyst", chaos={"llm_bad_json": True})
    text = await llm.call_llm(ctx, "planner", None, tier="fast")

    assert text == "OK"
    assert calls["count"] == 1
    events = await store.events_after("llm-chaos-test")
    assert any(event.type == "chaos_injected" for event in events)
    assert any(event.type == "fallback" for event in events)
