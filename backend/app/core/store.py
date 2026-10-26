"""SQLite persistence for runs, events and the HTTP cache."""

from __future__ import annotations

import asyncio
import json
import statistics
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import aiosqlite

from app.config import settings
from app.models.events import Event

SCHEMA = """
CREATE TABLE IF NOT EXISTS runs(
  id TEXT PRIMARY KEY,
  created_at TEXT,
  status TEXT,
  student_name TEXT,
  inputs_json TEXT,
  report_json TEXT,
  pending_json TEXT,
  error TEXT
);
CREATE TABLE IF NOT EXISTS events(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT,
  ts TEXT,
  type TEXT,
  agent TEXT,
  message TEXT,
  data_json TEXT
);
CREATE INDEX IF NOT EXISTS idx_events_run ON events(run_id, id);
CREATE TABLE IF NOT EXISTS cache(key TEXT PRIMARY KEY, value TEXT, created_at TEXT);
"""

_RUN_FIELDS = {"status", "student_name", "inputs_json", "report_json", "pending_json", "error"}
_init_lock = asyncio.Lock()
_initialized = False


def db_path() -> Path:
    return Path(settings.data_dir) / "app.db"


async def init_db() -> None:
    """Create tables once per process (idempotent)."""
    global _initialized
    async with _init_lock:
        if _initialized:
            return
        db_path().parent.mkdir(parents=True, exist_ok=True)
        async with aiosqlite.connect(db_path()) as db:
            await db.executescript(SCHEMA)
            await db.execute("PRAGMA journal_mode=WAL")
            await db.commit()
        _initialized = True


async def _connect() -> aiosqlite.Connection:
    await init_db()
    db = await aiosqlite.connect(db_path(), timeout=30)
    db.row_factory = aiosqlite.Row
    await db.execute("PRAGMA busy_timeout=5000")
    return db


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


async def create_run(
    run_id: str,
    student_name: str | None,
    inputs: dict[str, Any],
    status: str = "queued",
) -> None:
    db = await _connect()
    try:
        await db.execute(
            "INSERT INTO runs(id, created_at, status, student_name, inputs_json) VALUES(?,?,?,?,?)",
            (run_id, _now(), status, student_name, json.dumps(inputs)),
        )
        await db.commit()
    finally:
        await db.close()


async def update_run(run_id: str, **fields: Any) -> None:
    unknown = set(fields) - _RUN_FIELDS
    if unknown:
        raise ValueError(f"Unknown run fields: {sorted(unknown)}")
    if not fields:
        return
    values: list[Any] = []
    for name, value in fields.items():
        if name in {"inputs_json", "report_json", "pending_json"} and not isinstance(value, str):
            value = json.dumps(value, default=str)
        values.append(value)
    assignments = ", ".join(f"{name}=?" for name in fields)
    db = await _connect()
    try:
        await db.execute(f"UPDATE runs SET {assignments} WHERE id=?", (*values, run_id))
        await db.commit()
    finally:
        await db.close()


async def get_run(run_id: str) -> dict[str, Any] | None:
    db = await _connect()
    try:
        cursor = await db.execute("SELECT * FROM runs WHERE id=?", (run_id,))
        row = await cursor.fetchone()
    finally:
        await db.close()
    if row is None:
        return None
    data = dict(row)
    return {
        "id": data["id"],
        "created_at": data["created_at"],
        "status": data["status"],
        "student_name": data["student_name"],
        "error": data["error"],
        "inputs": _loads(data["inputs_json"], {}),
        "report": _loads(data["report_json"], None),
        "pending_questions": _loads(data["pending_json"], None),
    }


async def list_runs(limit: int = 50) -> list[dict[str, Any]]:
    db = await _connect()
    try:
        cursor = await db.execute(
            "SELECT id, created_at, status, student_name, error FROM runs ORDER BY created_at DESC LIMIT ?",
            (limit,),
        )
        rows = await cursor.fetchall()
    finally:
        await db.close()
    return [dict(row) for row in rows]


async def median_duration_sec(limit: int = 20) -> float | None:
    """Median duration of recent finished runs, used for the live ETA."""
    db = await _connect()
    try:
        cursor = await db.execute(
            "SELECT report_json FROM runs WHERE status='finished' AND report_json IS NOT NULL "
            "ORDER BY created_at DESC LIMIT ?",
            (limit,),
        )
        rows = await cursor.fetchall()
    finally:
        await db.close()
    durations = []
    for row in rows:
        report = _loads(row["report_json"], None)
        value = (report or {}).get("stats", {}).get("duration_sec")
        try:
            number = float(value)
        except (TypeError, ValueError):
            continue
        if number > 0:
            durations.append(number)
    return statistics.median(durations) if durations else None


async def insert_event(event: Event) -> int:
    db = await _connect()
    try:
        cursor = await db.execute(
            "INSERT INTO events(run_id, ts, type, agent, message, data_json) VALUES(?,?,?,?,?,?)",
            (
                event.run_id,
                event.ts.isoformat(),
                event.type,
                event.agent,
                event.message,
                json.dumps(event.data, default=str),
            ),
        )
        await db.commit()
        return int(cursor.lastrowid or 0)
    finally:
        await db.close()


async def events_after(run_id: str, after_id: int = 0, limit: int = 2000) -> list[Event]:
    db = await _connect()
    try:
        cursor = await db.execute(
            "SELECT * FROM events WHERE run_id=? AND id>? ORDER BY id LIMIT ?",
            (run_id, after_id, limit),
        )
        rows = await cursor.fetchall()
    finally:
        await db.close()
    return [
        Event(
            id=row["id"],
            run_id=row["run_id"],
            ts=datetime.fromisoformat(row["ts"]),
            type=row["type"],
            agent=row["agent"],
            message=row["message"],
            data=_loads(row["data_json"], {}),
        )
        for row in rows
    ]


async def cache_get(key: str, ttl_hours: int | None = None) -> str | None:
    ttl = settings.cache_ttl_hours if ttl_hours is None else ttl_hours
    db = await _connect()
    try:
        cursor = await db.execute("SELECT value, created_at FROM cache WHERE key=?", (key,))
        row = await cursor.fetchone()
    finally:
        await db.close()
    if row is None:
        return None
    try:
        created = datetime.fromisoformat(row["created_at"])
    except ValueError:
        return None
    if created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)
    if datetime.now(timezone.utc) - created > timedelta(hours=ttl):
        return None
    return row["value"]


async def cache_set(key: str, value: str) -> None:
    db = await _connect()
    try:
        await db.execute(
            "INSERT OR REPLACE INTO cache(key, value, created_at) VALUES(?,?,?)",
            (key, value, _now()),
        )
        await db.commit()
    finally:
        await db.close()


def _loads(raw: str | None, default: Any) -> Any:
    if not raw:
        return default
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return default
