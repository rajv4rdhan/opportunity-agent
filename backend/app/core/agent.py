"""The one decorator every agent uses: timing, events, error capture."""

from __future__ import annotations

import asyncio
import functools
import json
import time
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from typing import Any

from langgraph.errors import GraphInterrupt

from app.core.events import emit as emit_event
from app.core.utils import domain_of, normalize_url


@dataclass
class AgentCtx:
    run_id: str
    agent: str
    chaos: dict = field(default_factory=dict)
    worker: str | None = None

    async def emit(self, kind: str, message: str, **data: Any) -> None:
        """Emit an event that carries the parallel worker identity when present."""
        if self.worker and "worker" not in data:
            data["worker"] = self.worker
        await emit_event(self.run_id, kind, message, self.agent, **data)

    async def log(self, message: str, **data: Any) -> None:
        await self.emit("log", message, **data)

    async def decide(self, message: str, **data: Any) -> None:
        await self.emit("decision", message, **data)

    async def llm(
        self,
        prompt_name: str,
        response_model: type | None = None,
        tier: str = "fast",
        images: list[bytes] | None = None,
        **variables: Any,
    ) -> Any:
        from app.core.llm import call_llm

        return await call_llm(self, prompt_name, response_model, tier=tier, images=images, **variables)


AgentFn = Callable[[dict, AgentCtx], Awaitable[dict]]


def _field(value: Any, name: str) -> Any:
    return value.get(name) if isinstance(value, dict) else getattr(value, name, None)


def _candidate_data(state: dict) -> dict[str, str]:
    candidate = state.get("candidate")
    if candidate is None:
        return {}
    url = str(_field(candidate, "url") or "")
    if not url:
        return {}
    return {
        "worker": normalize_url(url),
        "title": str(_field(candidate, "title") or "")[:160],
        "domain": domain_of(url),
    }


def _profile_preview(result: dict) -> dict | None:
    profile = result.get("profile")
    if profile is None:
        return None

    test_scores = getattr(profile, "test_scores", None)
    scores = {
        key: value
        for key, value in (test_scores.model_dump().items() if test_scores else [])
        if value is not None
    }
    projects = [
        {
            "name": str(project.name)[:80],
            "source": project.source,
            "url": project.url,
        }
        for project in (getattr(profile, "projects", None) or [])[:8]
    ]
    preview = {
        "name": getattr(profile, "name", None),
        "current_degree": getattr(profile, "current_degree", None),
        "major": getattr(profile, "major", None),
        "university": getattr(profile, "university", None),
        "cgpa": getattr(profile, "cgpa", None),
        "cgpa_scale": getattr(profile, "cgpa_scale", None),
        "target_degree": getattr(profile, "target_degree", None),
        "target_fields": list(getattr(profile, "target_fields", []) or [])[:8],
        "target_countries": list(getattr(profile, "target_countries", []) or [])[:8],
        "test_scores": scores,
        "skills": [str(skill)[:40] for skill in (getattr(profile, "skills", []) or [])[:8]],
        "projects": projects,
        "budget_inr_per_year": getattr(profile, "budget_inr_per_year", None),
    }
    github = result.get("github")
    if github is not None:
        preview["github_username"] = getattr(github, "username", None)
    preview = {key: value for key, value in preview.items() if value not in (None, "", [])}

    if len(json.dumps(preview, default=str)) > 2000:
        preview["projects"] = projects[:3]
        preview["skills"] = preview.get("skills", [])[:5]
    return preview


def agent(name: str) -> Callable[[AgentFn], Callable[[dict], Awaitable[dict]]]:
    """Wrap an agent function into a LangGraph node with visible lifecycle events."""

    def decorator(fn: AgentFn) -> Callable[[dict], Awaitable[dict]]:
        @functools.wraps(fn)
        async def node(state: dict) -> dict:
            worker_data = _candidate_data(state)
            ctx = AgentCtx(
                run_id=state["run_id"],
                agent=name,
                chaos=state.get("chaos", {}),
                worker=worker_data.get("worker"),
            )
            await emit_event(ctx.run_id, "agent_started", name, name, **worker_data)
            started = time.perf_counter()
            try:
                result = await fn(state, ctx)
            except GraphInterrupt:
                raise
            except asyncio.CancelledError:
                raise
            except Exception as error:  # noqa: BLE001 - the graph must keep running
                await emit_event(
                    ctx.run_id,
                    "agent_failed",
                    f"{name}: {error}",
                    name,
                    error=str(error),
                    **worker_data,
                )
                return {"errors": [{"agent": name, "error": str(error)}]}

            duration = round(time.perf_counter() - started, 2)
            counts = {
                key: len(value)
                for key, value in result.items()
                if isinstance(value, list)
            }
            extra: dict[str, Any] = {**worker_data, "counts": counts}
            profile = result.get("profile")
            if profile is not None and getattr(profile, "name", None):
                extra["student_name"] = profile.name
            preview = _profile_preview(result)
            if preview:
                extra["profile_preview"] = preview
            await emit_event(
                ctx.run_id,
                "agent_finished",
                f"{name} finished in {duration}s",
                name,
                duration_sec=duration,
                updated=sorted(result.keys()),
                **extra,
            )
            return result

        return node

    return decorator
