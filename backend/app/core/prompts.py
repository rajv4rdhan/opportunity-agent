"""Prompt loading: markdown files with a ## SYSTEM and a ## USER section."""

from __future__ import annotations

import json
import re
from functools import lru_cache
from pathlib import Path
from typing import Any

from pydantic import BaseModel

PROMPTS_DIR = Path(__file__).resolve().parent.parent / "prompts"
_PLACEHOLDER = re.compile(r"\{([a-zA-Z_][a-zA-Z0-9_]*)\}")


@lru_cache(maxsize=64)
def _read(name: str) -> str:
    path = PROMPTS_DIR / f"{name}.md"
    if not path.exists():
        raise FileNotFoundError(f"Prompt not found: {path}")
    return path.read_text(encoding="utf-8")


def _split(text: str) -> tuple[str, str]:
    sections = re.split(r"^##\s+(SYSTEM|USER)\s*$", text, flags=re.MULTILINE | re.IGNORECASE)
    parts: dict[str, str] = {}
    for index in range(1, len(sections) - 1, 2):
        parts[sections[index].upper()] = sections[index + 1].strip()
    if "SYSTEM" not in parts or "USER" not in parts:
        raise ValueError("Prompt must contain '## SYSTEM' and '## USER' sections")
    return parts["SYSTEM"], parts["USER"]


def _render(value: Any) -> str:
    if isinstance(value, BaseModel):
        return value.model_dump_json(indent=2)
    if isinstance(value, (dict, list, tuple)):
        return json.dumps(value, indent=2, default=str)
    if value is None:
        return "null"
    return str(value)


def _fill(template: str, values: dict[str, str]) -> str:
    return _PLACEHOLDER.sub(lambda match: values.get(match.group(1), match.group(0)), template)


def load_prompt(name: str, **variables: Any) -> tuple[str, str]:
    """Return (system, user) with placeholders filled. Literal JSON braces are safe."""
    system, user = _split(_read(name))
    values = {key: _render(value) for key, value in variables.items()}
    return _fill(system, values), _fill(user, values)
