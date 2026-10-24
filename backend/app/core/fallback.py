"""One retry/fallback policy for every outbound provider call."""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from typing import TYPE_CHECKING, TypeVar

import httpx
from tenacity import (
    AsyncRetrying,
    retry_if_exception,
    stop_after_attempt,
    wait_exponential,
)

from app.core.chaos import maybe_fail
from app.core.events import emit

if TYPE_CHECKING:
    from app.core.agent import AgentCtx

T = TypeVar("T")
Attempt = tuple[str, Callable[[], Awaitable[T]]]


class AllProvidersFailed(RuntimeError):
    """Every provider for a label failed; the caller decides what to do."""

    def __init__(self, label: str, errors: list[tuple[str, str]]):
        self.label = label
        self.errors = errors
        detail = "; ".join(f"{name}: {error}" for name, error in errors) or "no providers configured"
        super().__init__(f"All providers failed for {label} ({detail})")


class EmptyResult(RuntimeError):
    pass


def _retryable(error: BaseException) -> bool:
    if isinstance(error, (httpx.TimeoutException, httpx.ConnectError, httpx.ReadError)):
        return True
    if isinstance(error, httpx.HTTPStatusError):
        return error.response.status_code in {429, 500, 502, 503, 504}
    return False


def _summary(result: object) -> str:
    if isinstance(result, (list, tuple, set)):
        return f"{len(result)} item(s)"
    if isinstance(result, str):
        return f"{len(result)} chars"
    return type(result).__name__


async def _with_retries(
    ctx: "AgentCtx",
    label: str,
    name: str,
    fn: Callable[[], Awaitable[T]],
    retries_each: int,
) -> T:
    async def on_retry(retry_state) -> None:
        error = retry_state.outcome.exception() if retry_state.outcome else None
        await emit(
            ctx.run_id,
            "retry",
            f"{label}/{name} failed ({error}); retrying",
            ctx.agent,
            data={"provider": name, "attempt": retry_state.attempt_number, "error": str(error)},
        )

    retrying = AsyncRetrying(
        stop=stop_after_attempt(max(1, retries_each)),
        wait=wait_exponential(multiplier=1, min=1, max=4),
        retry=retry_if_exception(_retryable),
        reraise=True,
        before_sleep=on_retry,
    )
    async for attempt in retrying:
        with attempt:
            return await fn()
    raise AllProvidersFailed(label, [(name, "retries exhausted")])


async def first_success(
    ctx: "AgentCtx",
    label: str,
    attempts: list[Attempt],
    retries_each: int = 2,
    is_empty: Callable[[T], bool] = lambda result: not result,
) -> T:
    """Try providers in order; each gets retries, then the next provider runs."""
    errors: list[tuple[str, str]] = []
    for position, (name, fn) in enumerate(attempts):
        next_name = attempts[position + 1][0] if position + 1 < len(attempts) else None
        try:
            await maybe_fail(ctx.run_id, ctx.chaos, f"{label}.{name}")
            await emit(
                ctx.run_id,
                "tool_call",
                f"{label}: calling {name}",
                ctx.agent,
                data={"label": label, "provider": name},
            )
            result = await _with_retries(ctx, label, name, fn, retries_each)
            if is_empty(result):
                raise EmptyResult(f"{label}/{name} returned no data")
            await emit(
                ctx.run_id,
                "tool_result",
                f"{label}: {name} returned {_summary(result)}",
                ctx.agent,
                data={"label": label, "provider": name, "result": _summary(result)},
            )
            return result
        except Exception as error:  # noqa: BLE001 - converted into a visible fallback
            errors.append((name, str(error)))
            tail = f"next: {next_name}" if next_name else "no providers left"
            await emit(
                ctx.run_id,
                "fallback",
                f"{label}: {name} failed ({error}); {tail}",
                ctx.agent,
                data={"label": label, "provider": name, "error": str(error), "next": next_name},
            )

    await emit(
        ctx.run_id,
        "tool_error",
        f"{label}: every provider failed",
        ctx.agent,
        data={"label": label, "errors": errors},
    )
    raise AllProvidersFailed(label, errors)
