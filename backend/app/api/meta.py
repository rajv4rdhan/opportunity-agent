"""Metadata for the frontend: providers, samples and chaos points."""

from __future__ import annotations

from fastapi import APIRouter

from app.config import PROVIDERS, settings
from app.core import store
from app.core.chaos import CHAOS_CAPTIONS, CHAOS_LABELS, CHAOS_POINTS
from app.models.api import ChaosPoint, MetaResponse, SampleInfo
from app.services.samples import load_samples
from app.tools.github import resolve_token

router = APIRouter(tags=["meta"])


def _providers() -> dict[str, bool]:
    ready: dict[str, bool] = {}
    for name in PROVIDERS:
        ready[name] = bool(resolve_token()) if name == "github" else settings.configured(name)
    return ready


@router.get("/meta", response_model=MetaResponse)
async def meta() -> MetaResponse:
    samples = [SampleInfo.model_validate(item) for item in load_samples()]
    chaos_points = [
        ChaosPoint(
            key=key,
            label=CHAOS_LABELS.get(key, key.replace("_", " ").title()),
            caption=CHAOS_CAPTIONS.get(key, ""),
        )
        for key in CHAOS_POINTS
    ]
    return MetaResponse(
        providers=_providers(),
        samples=samples,
        chaos_points=chaos_points,
        median_duration_sec=await store.median_duration_sec(),
    )
