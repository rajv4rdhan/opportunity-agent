"""Command line entry point: `python -m app.cli agent <name> <sample>`."""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from pathlib import Path
from uuid import uuid4

from app.config import BACKEND_DIR
from app.core import store
from app.core.events import emit
from app.models.state import add_unique_candidates, merge_by_id

AGENT_NAMES = [
    "profile_analyst",
    "github_enricher",
    "clarifier",
    "planner",
    "scout",
    "verifier",
    "matcher",
    "ranker",
    "sop_writer",
    "critic",
    "finalizer",
]


def resolve_sample(value: str) -> Path:
    path = Path(value)
    if path.exists():
        return path.resolve()
    candidate = BACKEND_DIR / "samples" / value
    if candidate.exists():
        return candidate
    raise SystemExit(f"Sample not found: {value}")


def load_sample(folder: Path) -> dict:
    form_path = folder / "form.json"
    form = json.loads(form_path.read_text()) if form_path.exists() else {}
    resume = folder / "resume.pdf"
    transcript = folder / "transcript.pdf"
    return {
        "resume_path": str(resume) if resume.exists() else None,
        "transcript_path": str(transcript) if transcript.exists() else None,
        "form": form,
    }


def merge(state: dict, update: dict) -> None:
    for key, value in update.items():
        if key == "opportunities":
            state[key] = merge_by_id(state.get(key, []), value)
        elif key == "candidates":
            state[key] = add_unique_candidates(state.get(key, []), value)
        elif key in {"rejected", "errors"}:
            state[key] = [*state.get(key, []), *value]
        else:
            state[key] = value


async def step(node, state: dict) -> None:
    result = await node(state)
    merge(state, result)
    print(f"  [{node.__name__}] {', '.join(sorted(result)) or 'no changes'}")
    for error in result.get("errors", []):
        print(f"     ! {error.get('agent')}: {error.get('error')}")
    if result.get("profile"):
        profile = result["profile"]
        print(
            f"     profile: {profile.name} | CGPA {profile.cgpa}/{profile.cgpa_scale:g} | "
            f"{profile.target_degree or 'degree?'} in {', '.join(profile.target_fields) or 'field?'} | "
            f"countries: {', '.join(profile.target_countries) or 'any'}"
        )
    if "github" in result:
        github = result["github"]
        print(f"     github: {'enriched' if github else 'skipped'}")
    if "plan" in result:
        print(f"     plan: {len(result['plan'])} queries")
    if "candidates" in result:
        print(f"     candidates: {len(result['candidates'])} new")
    if "opportunities" in result:
        print(f"     opportunities: {len(result['opportunities'])}")
    if "gaps" in result:
        print(f"     gaps: {len(result['gaps'])}")
    if "top5" in result:
        for match in result["top5"]:
            print(f"     #{match.rank} {match.opportunity.name} — {match.opportunity.score:.0f}/100")
    if result.get("sop_markdown"):
        print(f"     SOP: {len(result['sop_markdown'].split())} words")
    if state.get("profile") is not None:
        await store.update_run(state["run_id"], student_name=state["profile"].name)


async def verify_all(state: dict) -> None:
    from app.agents.verifier import verifier

    pending = state.get("pending_verify", [])
    for index, candidate in enumerate(pending, start=1):
        print(f"  [verifier] {index}/{len(pending)} {candidate.url}")
        payload = {
            "run_id": state["run_id"],
            "chaos": state.get("chaos", {}),
            "profile": state["profile"],
            "candidate": candidate,
        }
        merge(state, await verifier(payload))


async def run_until(target: str, folder: Path) -> None:
    from app.agents import (
        clarifier,
        critic,
        finalizer,
        github_enricher,
        matcher,
        planner,
        profile_analyst,
        ranker,
        scout,
        sop_writer,
    )

    await store.init_db()
    run_id = f"cli-{uuid4().hex[:12]}"
    state = {
        "run_id": run_id,
        "inputs": load_sample(folder),
        "chaos": {},
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
    await store.create_run(run_id, None, state["inputs"])
    await emit(run_id, "run_started", f"CLI: {target} on {folder.name}")
    print(f"Run {run_id} — {folder.name}")

    await step(profile_analyst.profile_analyst, state)
    if target == "profile_analyst":
        return
    if target == "clarifier":
        try:
            await step(clarifier.clarifier, state)
        except Exception as error:  # GraphInterrupt carries the questions
            print(f"  [clarifier] waiting for input: {error}")
        return

    await step(github_enricher.github_enricher, state)
    if target == "github_enricher":
        return
    await step(planner.planner, state)
    if target == "planner":
        return
    await step(scout.scout, state)
    if target == "scout":
        return

    await verify_all(state)
    if target == "verifier":
        return
    await step(matcher.matcher, state)
    if target == "matcher":
        return
    await step(ranker.ranker, state)
    if target == "ranker":
        return
    await step(sop_writer.sop_writer, state)
    if target == "sop_writer":
        return
    await step(critic.critic, state)
    if target == "critic":
        return
    await step(finalizer.finalizer, state)


async def amain(args: argparse.Namespace) -> int:
    if args.command == "agent":
        await run_until(args.name, resolve_sample(args.sample))
        return 0
    if args.command == "run":
        from app.services import runner

        run = await runner.run_sample(resolve_sample(args.sample), chaos=parse_chaos(args.chaos))
        return 0 if run.get("status") == "finished" else 1
    return 1


def parse_chaos(value: str) -> dict[str, bool]:
    flags = [item.strip() for item in (value or "").split(",") if item.strip()]
    return {flag: True for flag in flags}


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="python -m app.cli", description="ScholarSwarm CLI")
    sub = parser.add_subparsers(dest="command", required=True)

    agent_parser = sub.add_parser("agent", help="Run a single agent (with its prerequisites)")
    agent_parser.add_argument("name", choices=AGENT_NAMES)
    agent_parser.add_argument("sample", help="Sample folder name or path")

    run_parser = sub.add_parser("run", help="Run the full graph")
    run_parser.add_argument("sample", help="Sample folder name or path")
    run_parser.add_argument("--chaos", default="", help="Comma-separated chaos flags")
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    try:
        return asyncio.run(amain(args))
    except KeyboardInterrupt:
        return 130


if __name__ == "__main__":
    sys.exit(main())
