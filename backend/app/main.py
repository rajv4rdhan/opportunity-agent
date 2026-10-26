"""FastAPI application factory. Serves the REST API and the built React SPA."""

from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncIterator

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles

from app.api.health import router as health_router
from app.api.meta import router as meta_router
from app.api.runs import router as runs_router
from app.config import BACKEND_DIR, settings
from app.core import store
from app.services import runner

FRONTEND_DIST = BACKEND_DIR.parent / "frontend" / "dist"


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    (settings.data_dir / "uploads").mkdir(parents=True, exist_ok=True)
    settings.export_env()
    await store.init_db()
    await runner.init_graph()
    yield
    await runner.shutdown()


def _mount_spa(app: FastAPI) -> None:
    dist = Path(FRONTEND_DIST)
    index = dist / "index.html"

    if not index.exists():
        @app.get("/", include_in_schema=False)
        async def frontend_missing() -> PlainTextResponse:
            return PlainTextResponse(
                "Frontend not built. Run `npm install && npm run build` in frontend/."
            )

        return

    assets = dist / "assets"
    if assets.exists():
        app.mount("/assets", StaticFiles(directory=assets), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    async def spa(path: str):
        if path.startswith("api/") or path == "api":
            raise HTTPException(status_code=404, detail="Not Found")
        candidate = (dist / path).resolve()
        if path and candidate.is_file() and (candidate == dist.resolve() or dist.resolve() in candidate.parents):
            return FileResponse(candidate)
        return FileResponse(index, headers={"Cache-Control": "no-cache"})


def create_app() -> FastAPI:
    app = FastAPI(title="ScholarSwarm", version="0.2.0", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=False,
        allow_methods=["GET", "POST", "HEAD", "OPTIONS"],
        allow_headers=["*"],
        max_age=600,
    )
    app.include_router(health_router, prefix="/api")
    app.include_router(meta_router, prefix="/api")
    app.include_router(runs_router, prefix="/api")
    _mount_spa(app)
    return app


app = create_app()
