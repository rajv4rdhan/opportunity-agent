"""REST API for runs, events, graphs, what-if and downloads."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel, ValidationError
from sse_starlette.sse import EventSourceResponse

from app.config import BACKEND_DIR, settings
from app.core import store
from app.core.events import subscribe
from app.models.inputs import RunForm
from app.models.profile import TestScores
from app.models.report import FinalReport
from app.services import matching, runner
from app.services.report import report_to_markdown
from app.tools.graph_store import open_readonly_store

router = APIRouter(tags=["runs"])
MAX_UPLOAD_BYTES = 10 * 1024 * 1024


class ResumeBody(BaseModel):
    answers: dict[str, Any] = {}


class WhatIfBody(BaseModel):
    overrides: dict[str, Any] = {}


def _csv(value: str | None) -> list[str]:
    return [item.strip() for item in (value or "").split(",") if item.strip()]


def _json(value: str | None, default: Any) -> Any:
    if not value:
        return default
    try:
        return json.loads(value)
    except json.JSONDecodeError as error:
        raise HTTPException(status_code=422, detail=f"Invalid JSON: {error}") from error


async def _save_upload(upload: UploadFile | None, name: str) -> Path | None:
    if upload is None or not upload.filename:
        return None
    if not upload.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=422, detail="Only PDF files are accepted")
    content = await upload.read()
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File is larger than 10 MB")
    folder = Path(settings.data_dir) / "uploads" / "pending" / uuid4().hex
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / name
    path.write_bytes(content)
    return path


def _build_form(
    sample: str | None,
    description: str | None,
    input_modes: str | None,
    github_url: str | None,
    linkedin_url: str | None,
    other_links: str | None,
    target_countries: str | None,
    target_degree: str | None,
    target_fields: str | None,
    budget_inr_per_year: int | None,
    nationality: str | None,
    test_scores_json: str | None,
    notes: str | None,
    chaos_json: str | None,
) -> RunForm:
    try:
        scores = TestScores.model_validate(_json(test_scores_json, {}))
        chaos = {str(key): bool(value) for key, value in _json(chaos_json, {}).items()}
    except ValidationError as error:
        raise HTTPException(status_code=422, detail=error.errors()) from error
    try:
        return RunForm(
            sample=sample,
            description=description,
            input_modes=[mode for mode in _csv(input_modes) if mode in {"resume", "text", "voice"}],
            github_url=github_url,
            linkedin_url=linkedin_url,
            other_links=_csv(other_links),
            target_countries=_csv(target_countries),
            target_degree=target_degree,
            target_fields=_csv(target_fields),
            nationality=nationality,
            budget_inr_per_year=budget_inr_per_year,
            test_scores=scores,
            notes=notes,
            chaos=chaos,
        )
    except ValidationError as error:
        raise HTTPException(status_code=422, detail=error.errors()) from error


@router.get("/samples")
async def list_samples() -> list[str]:
    root = BACKEND_DIR / "samples"
    return sorted(folder.name for folder in root.iterdir() if folder.is_dir()) if root.exists() else []


@router.post("/runs")
async def create_run(
    resume: UploadFile | None = File(None),
    transcript: UploadFile | None = File(None),
    sample: str | None = Form(None),
    description: str | None = Form(None),
    input_modes: str | None = Form(None),
    github_url: str | None = Form(None),
    linkedin_url: str | None = Form(None),
    other_links: str | None = Form(None),
    target_countries: str | None = Form(None),
    target_degree: str | None = Form(None),
    target_fields: str | None = Form(None),
    budget_inr_per_year: int | None = Form(None),
    nationality: str | None = Form(None),
    test_scores_json: str | None = Form(None),
    notes: str | None = Form(None),
    chaos_json: str | None = Form(None),
) -> dict:
    resume_path = await _save_upload(resume, "resume.pdf")
    transcript_path = await _save_upload(transcript, "transcript.pdf")
    form = _build_form(
        sample,
        description,
        input_modes,
        github_url,
        linkedin_url,
        other_links,
        target_countries,
        target_degree,
        target_fields,
        budget_inr_per_year,
        nationality,
        test_scores_json,
        notes,
        chaos_json,
    )
    try:
        run_id = await runner.create_run(form, resume_path, transcript_path)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    return {"run_id": run_id}


@router.get("/runs")
async def list_runs(limit: int = 50) -> list[dict]:
    return await store.list_runs(limit=limit)


@router.get("/runs/{run_id}")
async def get_run(run_id: str) -> dict:
    run = await store.get_run(run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Run not found")
    return run


@router.get("/runs/{run_id}/events")
async def run_events(run_id: str, after: int = 0):
    run = await store.get_run(run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Run not found")

    async def generate():
        async for event in subscribe(run_id, after):
            yield {"data": event.model_dump_json()}
            if event.type in {"run_finished", "run_failed"}:
                break

    return EventSourceResponse(generate(), ping=15)


@router.post("/runs/{run_id}/resume")
async def resume_run(run_id: str, body: ResumeBody) -> dict:
    run = await store.get_run(run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Run not found")
    if run["status"] != "waiting_input":
        raise HTTPException(status_code=409, detail=f"Run is {run['status']}, not waiting for input")
    await runner.resume_run(run_id, body.answers)
    return {"ok": True}


@router.get("/runs/{run_id}/graph")
async def run_graph(run_id: str) -> dict:
    graph = await open_readonly_store(run_id)
    return await graph.export(run_id)


@router.post("/runs/{run_id}/whatif")
async def whatif(run_id: str, body: WhatIfBody) -> dict:
    run = await store.get_run(run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Run not found")
    opportunities, gaps = await matching.whatif(run_id, body.overrides)
    return {
        "opportunities": [opportunity.model_dump(mode="json") for opportunity in opportunities],
        "gaps": [gap.model_dump(mode="json") for gap in gaps],
    }


@router.get("/runs/{run_id}/report.md")
async def download_report(run_id: str) -> Response:
    report = await _report(run_id)
    return Response(
        content=report_to_markdown(report),
        media_type="text/markdown",
        headers={"Content-Disposition": 'attachment; filename="report.md"'},
    )


@router.get("/runs/{run_id}/sop.md")
async def download_sop(run_id: str) -> Response:
    report = await _report(run_id)
    if not report.sop_markdown:
        raise HTTPException(status_code=404, detail="No SOP in this run")
    return Response(
        content=report.sop_markdown,
        media_type="text/markdown",
        headers={"Content-Disposition": 'attachment; filename="sop.md"'},
    )


async def _report(run_id: str) -> FinalReport:
    run = await store.get_run(run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Run not found")
    if not run.get("report"):
        raise HTTPException(status_code=404, detail="Report is not ready")
    return FinalReport.model_validate(run["report"])
