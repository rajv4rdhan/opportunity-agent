"""FastAPI application factory. The NiceGUI UI is mounted on the same app."""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from nicegui import ui

from app.api.health import router as health_router
from app.config import settings
from app.ui import register_pages


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    (settings.data_dir / "uploads").mkdir(parents=True, exist_ok=True)
    settings.export_env()
    yield


def create_app() -> FastAPI:
    app = FastAPI(title="ScholarSwarm", version="0.1.0", lifespan=lifespan)
    app.include_router(health_router, prefix="/api")

    register_pages()
    ui.run_with(
        app,
        title="ScholarSwarm",
        storage_secret=settings.storage_secret,
        favicon="🎓",
    )
    return app


app = create_app()
