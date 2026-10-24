"""Health endpoint: reports which providers are configured (never key values)."""

from __future__ import annotations

from fastapi import APIRouter

from app.config import PROVIDERS, settings

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict:
    return {
        "status": "ok",
        "providers": {name: settings.configured(name) for name in PROVIDERS},
    }
