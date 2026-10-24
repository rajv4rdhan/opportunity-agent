"""Health endpoint: reports which providers are configured (never key values)."""

from __future__ import annotations

from fastapi import APIRouter

from app.config import PROVIDERS, settings

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict:
    from app.tools.github import resolve_token

    providers = {name: settings.configured(name) for name in PROVIDERS}
    providers["github"] = bool(resolve_token())
    return {"status": "ok", "providers": providers}
