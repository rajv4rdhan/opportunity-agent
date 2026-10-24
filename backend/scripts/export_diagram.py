"""Export the compiled LangGraph diagram to docs/agents.mmd."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import BACKEND_DIR  # noqa: E402
from app.graph.build import build_graph  # noqa: E402


def main() -> int:
    diagram = build_graph().get_graph().draw_mermaid()
    destination = BACKEND_DIR.parent / "docs" / "agents.mmd"
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(diagram + "\n", encoding="utf-8")
    print(f"wrote {destination} ({len(diagram)} chars)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
