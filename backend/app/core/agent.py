"""The one decorator every agent uses: timing, events, error capture."""

from __future__ import annotations

import asyncio
import time
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from typing import Any

from langgraph.errors import GraphInterrupt

from app.core.events import emit


@dataclass
class AgentCtx:
    run_id: str
    agent: str
    chaos: dict = field(default_factory=dict)

    async def log(self, message: str, **data: Any) -> None:
        await emit(self.run_id, "log", message, self.agent, **data)

    async def decide(self, message: str, **data: Any) -> None:
        await emit(self.run_id, "decision", message, self.agent, **data)

    async def llm(
        self,
        prompt_name: str,
        response_model: type | None = None,
        tier: str = "fast",
        **variables: Any,
    ) -> Any:
        from app.core.llm import call_llm

        return await call_llm(self, prompt_name, response_model, tier=tier, **variables)


AgentFn = Callable[[dict, AgentCtx], Awaitable[dict]]


def agent(name: str) -> Callable[[AgentFn], Callable[[dict], Awaitable[dict]]]:
    """Wrap an agent function into a LangGraph node with visible lifecycle events."""

    def decorator(fn: AgentFn) -> Callable[[dict], Awaitable[dict]]:
        async def node(state: dict) -> dict:
            ctx = AgentCtx(run_id=state["run_id"], agent=name, chaos=state.get("chaos", {}))
            await emit(ctx.run_id, "agent_started", name, name)
            started = time.perf_counter()
            try:
                result = await fn(state, ctx)
            except GraphInterrupt:
                raise
            except asyncio.CancelledError:
                raise
            except Exception as error:  # noqa: BLE001 - the graph must keep running
                await emit(ctx.run_id, "agent_failed", f"{name}: {error}", name, error=str(error))
                return {"errors": [{"agent": name, "error": str(error)}]}

            duration = round(time.perf_counter() - started, 2)
            await emit(
                ctx.run_id,
                "agent_finished",
                f"{name} finished in {duration}s",
                name,
                duration_sec=duration,
                updated=sorted(result.keys()),
            )
            return result

        return node

    return decorator
