"""The ONLY place an LLM is called. Structured output + retries + cost accounting."""

from __future__ import annotations

import base64
from typing import TYPE_CHECKING, Any, Literal

import instructor
import litellm
from pydantic import BaseModel

from app.config import settings
from app.core.chaos import maybe_fail
from app.core.events import bump
from app.core.fallback import first_success
from app.core.prompts import load_prompt

if TYPE_CHECKING:
    from app.core.agent import AgentCtx

litellm.suppress_debug_info = True
if settings.langfuse_public_key and settings.langfuse_secret_key:
    try:
        litellm.success_callback = ["langfuse"]
    except Exception:  # pragma: no cover - tracing is optional
        pass

_structured = instructor.from_litellm(litellm.acompletion, mode=instructor.Mode.JSON)
_llm_started: set[str] = set()


def reset_run(run_id: str) -> None:
    _llm_started.discard(run_id)


def _message_content(user: str, images: list[bytes] | None) -> str | list[dict[str, Any]]:
    if not images:
        return user
    content: list[dict[str, Any]] = [{"type": "text", "text": user}]
    for image in images:
        encoded = base64.b64encode(image).decode("ascii")
        content.append({"type": "image_url", "image_url": {"url": f"data:image/png;base64,{encoded}"}})
    return content


def _call_kwargs(temperature: float) -> dict[str, Any]:
    kwargs: dict[str, Any] = {
        "temperature": temperature,
        "max_tokens": 4000,
        "timeout": 120,
        "max_retries": 0,  # retries belong to core/fallback.py
    }
    if settings.llm_api_base:
        kwargs["api_base"] = settings.llm_api_base
    if settings.llm_api_key:
        kwargs["api_key"] = settings.llm_api_key
    return kwargs


def _models(tier: Literal["fast", "smart"]) -> list[str]:
    primary = settings.model_smart if tier == "smart" else settings.model_fast
    ordered = [primary, settings.model_fallback]
    return list(dict.fromkeys(model for model in ordered if model))


def _add_cost(run_id: str, completion: Any) -> None:
    cost = 0.0
    try:
        cost = float(litellm.completion_cost(completion_response=completion) or 0.0)
    except Exception:  # pragma: no cover - unknown models have no price table
        cost = 0.0
    bump(run_id, llm_calls=1, est_cost_usd=cost)


async def call_llm(
    ctx: "AgentCtx",
    prompt_name: str,
    response_model: type[BaseModel] | None = None,
    tier: Literal["fast", "smart"] = "fast",
    images: list[bytes] | None = None,
    temperature: float = 0.2,
    **prompt_vars: Any,
) -> Any:
    """Render the prompt, call the model chain, return text or a validated model."""
    system, user = load_prompt(prompt_name, **prompt_vars)
    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": _message_content(user, images)},
    ]
    first_call = ctx.run_id not in _llm_started
    _llm_started.add(ctx.run_id)
    kwargs = _call_kwargs(temperature)

    async def invoke(model: str) -> Any:
        if first_call:
            await maybe_fail(ctx.run_id, ctx.chaos, "llm.first_call")
        if response_model is not None:
            parsed, completion = await _structured.chat.completions.create_with_completion(
                model=model,
                messages=messages,
                response_model=response_model,
                max_retries=2,
                **kwargs,
            )
            _add_cost(ctx.run_id, completion)
            return parsed
        completion = await litellm.acompletion(model=model, messages=messages, **kwargs)
        _add_cost(ctx.run_id, completion)
        return (completion.choices[0].message.content or "").strip()

    attempts = [(model, lambda model=model: invoke(model)) for model in _models(tier)]
    if not attempts:
        raise RuntimeError("No LLM model configured (set MODEL_SMART / MODEL_FAST)")

    result = await first_success(
        ctx,
        "llm",
        attempts,
        retries_each=2,
        is_empty=lambda value: value is None or (isinstance(value, str) and not value.strip()),
    )
    return result
