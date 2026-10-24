"""Start, stream, interrupt and resume graph runs. Shared by the API and the UI."""

from __future__ import annotations

import asyncio
import json
import shutil
import time
from pathlib import Path
from typing import Any
from uuid import uuid4

from langgraph.types import Command

from app.config import BACKEND_DIR, settings
from app.core import store
from app.core.events import emit, get_stats, subscribe
from app.models.inputs import RunForm
from app.tools import browser, graph_store
from app.core import http

_graph: Any = None
_saver_context: Any = None


def _initial_state(run_id: str, inputs: dict, chaos: dict) -> dict:
    return {
        "run_id": run_id,
        "inputs": inputs,
        "chaos": chaos,
        "candidates": [],
        "opportunities": [],
        "rejected": [],
        "errors": [],
        "plan": [],
        "scout_round": 0,
        "sop_revisions": 0,
        "critic_notes": [],
        "critic_passed": False,
    }


async def init_graph() -> Any:
    """Compile the graph once and keep the SQLite checkpointer open."""
    global _graph, _saver_context
    if _graph is not None:
        return _graph
    from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver

    from app.graph.build import build_graph

    settings.data_dir.mkdir(parents=True, exist_ok=True)
    _saver_context = AsyncSqliteSaver.from_conn_string(str(settings.data_dir / "checkpoints.db"))
    saver = await _saver_context.__aenter__()
    _graph = build_graph(saver)
    return _graph


async def close_graph() -> None:
    global _graph, _saver_context
    if _saver_context is not None:
        await _saver_context.__aexit__(None, None, None)
        _saver_context = None
    _graph = None


def _sample_folder(name: str) -> Path:
    root = (BACKEND_DIR / "samples").resolve()
    folder = (root / name).resolve()
    if folder != root and root not in folder.parents:
        raise ValueError(f"Invalid sample name: {name}")
    if not folder.exists():
        raise ValueError(f"Sample not found: {name}")
    return folder


def _copy_upload(source: Path | None, destination: Path) -> Path | None:
    if source is None or not Path(source).exists():
        return None
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, destination)
    return destination


async def create_run(
    form: RunForm,
    resume: Path | None,
    transcript: Path | None,
) -> str:
    """The ONLY way to create a run (used by the REST API and the UI)."""
    run_id = uuid4().hex[:12]
    upload_dir = Path(settings.data_dir) / "uploads" / run_id
    resume_path = _copy_upload(resume, upload_dir / "resume.pdf")
    transcript_path = _copy_upload(transcript, upload_dir / "transcript.pdf")

    if form.sample:
        folder = _sample_folder(form.sample)
        if resume_path is None and (folder / "resume.pdf").exists():
            resume_path = folder / "resume.pdf"
        if transcript_path is None and (folder / "transcript.pdf").exists():
            transcript_path = folder / "transcript.pdf"
        if not (form.github_url or form.target_countries or form.target_degree):
            sample_form = folder / "form.json"
            if sample_form.exists():
                merged = RunForm(**json.loads(sample_form.read_text()))
                merged.chaos = form.chaos or merged.chaos
                form = merged

    if resume_path is None:
        raise ValueError("A resume PDF or a sample profile is required")

    inputs = {
        "resume_path": str(resume_path),
        "transcript_path": str(transcript_path) if transcript_path else None,
        "form": form.model_dump(mode="json"),
    }
    await store.create_run(run_id, None, inputs, status="queued")
    start_run(run_id, inputs, form.chaos)
    return run_id


def start_run(run_id: str, inputs: dict, chaos: dict) -> None:
    asyncio.create_task(_execute(run_id, _initial_state(run_id, inputs, chaos)))


def _config(run_id: str) -> dict:
    return {
        "configurable": {"thread_id": run_id},
        "max_concurrency": settings.verifier_concurrency,
        "recursion_limit": 100,
    }


def _interrupt_payload(interrupts: Any) -> dict:
    first = interrupts[0] if isinstance(interrupts, (list, tuple)) and interrupts else interrupts
    value = getattr(first, "value", None)
    if isinstance(value, dict):
        return value
    return {"questions": value}


async def _stream(graph: Any, run_id: str, payload: Any, config: dict) -> str:
    async for chunk in graph.astream(payload, config=config, stream_mode="updates"):
        if "__interrupt__" in chunk:
            interrupt = _interrupt_payload(chunk["__interrupt__"])
            await store.update_run(run_id, status="waiting_input", pending_json=interrupt)
            await emit(run_id, "interrupt", "Waiting for your input", data=interrupt)
            return "interrupted"
    return "done"


async def _execute(run_id: str, initial_state: dict) -> None:
    graph = await init_graph()
    await store.update_run(run_id, status="running")
    await emit(run_id, "run_started", "Run started", data={"run_id": run_id})
    started = time.monotonic()
    try:
        async with asyncio.timeout(settings.run_timeout_minutes * 60):
            outcome = await _stream(graph, run_id, initial_state, _config(run_id))
        if outcome == "done":
            await _finish(run_id, started)
    except TimeoutError:
        await _fail(run_id, f"Run exceeded the {settings.run_timeout_minutes}-minute limit")
    except Exception as error:  # noqa: BLE001 - a crashed run must be visible
        await _fail(run_id, f"{type(error).__name__}: {error}")
    finally:
        await browser.close_browser(run_id)


async def _finish(run_id: str, started: float) -> None:
    run = await store.get_run(run_id)
    if run is None or run.get("status") == "failed":
        return
    if not run.get("report"):
        await _fail(run_id, "The graph finished without producing a report")
        return
    stats = get_stats(run_id)
    stats.duration_sec = round(time.monotonic() - started, 1)
    report = dict(run["report"])
    report["stats"] = stats.model_dump(mode="json")
    await store.update_run(run_id, status="finished", report_json=report)
    await emit(
        run_id,
        "run_finished",
        f"Finished in {stats.duration_sec:.0f}s",
        data={"top5": len(report.get("top5", [])), "opportunities": len(report.get("all_opportunities", []))},
    )


async def _fail(run_id: str, message: str) -> None:
    await store.update_run(run_id, status="failed", error=message)
    await emit(run_id, "run_failed", message)


async def resume_run(run_id: str, answers: dict) -> None:
    """Resume an interrupted graph in the background; the UI keeps polling events."""
    asyncio.create_task(_resume(run_id, answers))


async def _resume(run_id: str, answers: dict) -> None:
    graph = await init_graph()
    await store.update_run(run_id, status="running", pending_json=None)
    await emit(run_id, "resumed", "Resuming with your answers", data={"answers": answers})
    started = time.monotonic()
    try:
        async with asyncio.timeout(settings.run_timeout_minutes * 60):
            outcome = await _stream(graph, run_id, Command(resume=answers), _config(run_id))
        if outcome == "done":
            await _finish(run_id, started)
    except TimeoutError:
        await _fail(run_id, f"Run exceeded the {settings.run_timeout_minutes}-minute limit")
    except Exception as error:  # noqa: BLE001
        await _fail(run_id, f"{type(error).__name__}: {error}")
    finally:
        await browser.close_browser(run_id)


async def wait_for_run(run_id: str, poll_seconds: float = 0.5) -> dict:
    while True:
        run = await store.get_run(run_id)
        if run is None:
            raise ValueError(f"Run not found: {run_id}")
        if run["status"] in {"finished", "failed"}:
            return run
        await asyncio.sleep(poll_seconds)


async def run_sample(folder: Path, chaos: dict | None = None) -> dict:
    """CLI helper: create a run from a sample folder and stream its events."""
    form_path = folder / "form.json"
    form = RunForm(**json.loads(form_path.read_text())) if form_path.exists() else RunForm()
    form.chaos = chaos or form.chaos
    run_id = await create_run(
        form,
        folder / "resume.pdf" if (folder / "resume.pdf").exists() else None,
        folder / "transcript.pdf" if (folder / "transcript.pdf").exists() else None,
    )
    print(f"Run {run_id} — {folder.name}")

    async for event in subscribe(run_id):
        agent = event.agent or "run"
        print(f"[{agent}] {event.type}: {event.message}")
        if event.type in {"run_finished", "run_failed"}:
            break

    run = await store.get_run(run_id)
    report = run.get("report") if run else None
    if report:
        print("\nTOP 5")
        for match in report.get("top5", []):
            opportunity = match["opportunity"]
            sources = ", ".join(source["url"] for source in opportunity.get("sources", []))
            print(
                f"  {match['rank']}. {opportunity['name']} — deadline {opportunity.get('deadline') or 'unknown'} "
                f"— score {opportunity.get('score')} — {sources}"
            )
        print(f"\nSOP: {len((report.get('sop_markdown') or '').split())} words")
    else:
        print(f"\nRun status: {run.get('status') if run else 'missing'} — {run.get('error') if run else ''}")
    return run or {}


async def shutdown() -> None:
    await browser.close_all()
    await graph_store.close_graph_store()
    await http.close_http()
    await close_graph()
