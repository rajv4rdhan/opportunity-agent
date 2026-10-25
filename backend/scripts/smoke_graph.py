"""Verify the configured Neo4j layer end to end (init, write, paths, export, reuse)."""

from __future__ import annotations

import argparse
import asyncio
import sys
from datetime import date, datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import settings  # noqa: E402
from app.models.opportunity import Opportunity, Requirement, Source  # noqa: E402
from app.models.profile import Project, StudentProfile  # noqa: E402
from app.tools.graph_store import Neo4jStore  # noqa: E402

STUDENT_ID = "smoke-student"
OPPORTUNITY_ID = "smoke-opportunity"
ORG = "Smoke University"
SOURCE_URL = "https://example.edu/smoke"


def _profile() -> StudentProfile:
    return StudentProfile(
        name="Smoke Student",
        cgpa=8.2,
        cgpa_scale=10,
        skills=["python"],
        projects=[Project(name="Smoke Project", tech=["python"])],
    )


def _opportunity() -> Opportunity:
    return Opportunity(
        id=OPPORTUNITY_ID,
        name="Smoke Scholarship",
        provider_org=ORG,
        country="Germany",
        kind="scholarship",
        funding_type="full",
        official_url=SOURCE_URL,
        verification="verified_official",
        confidence=0.9,
        deadline=date(2027, 1, 15),
        valued_skills=["Python"],
        requirements=[
            Requirement(
                key="min_gpa",
                description="GPA 3.0/4.0",
                numeric_value=3.0,
                numeric_scale=4.0,
                met="yes",
            )
        ],
        sources=[
            Source(
                url=SOURCE_URL,
                quote="Applications open",
                fetch_method="jina",
                fetched_at=datetime.now(timezone.utc),
            )
        ],
        eligibility="eligible",
        score=70,
    )


async def cleanup(store: Neo4jStore) -> None:
    await store._write(
        "MATCH (n) WHERE n.id IN $ids OR n.id = $source OR n.name = $org "
        "OR n.id STARTS WITH $project_prefix OR n.id STARTS WITH $opp_prefix DETACH DELETE n",
        ids=[STUDENT_ID, OPPORTUNITY_ID],
        source=SOURCE_URL,
        org=ORG,
        project_prefix="project:smoke-student:",
        opp_prefix=f"{OPPORTUNITY_ID}:",
    )


async def main(keep: bool) -> int:
    if not settings.configured("neo4j"):
        print("Neo4j is not configured (NEO4J_URI/USERNAME/PASSWORD are empty).", file=sys.stderr)
        return 2
    store = Neo4jStore()
    try:
        await store.init()
        if not keep:
            await cleanup(store)

        await store.upsert_student(STUDENT_ID, _profile(), None)
        await store.upsert_opportunity(_opportunity())
        await store.link_eligibility(STUDENT_ID, _opportunity())

        paths = await store.explain_paths(STUDENT_ID, OPPORTUNITY_ID)
        graph = await store.export(STUDENT_ID)
        recent = await store.recent_opportunities(["Germany"])

        print(f"constraints/connection: OK")
        print(f"paths: {len(paths)}")
        for path in paths:
            print("  " + " → ".join(path))
        print(f"export: {len(graph.get('nodes', []))} nodes, {len(graph.get('links', []))} links")
        print(f"recent in Germany: {[item.name for item in recent]}")

        if not paths or not graph.get("nodes") or not any(item.id == OPPORTUNITY_ID for item in recent):
            print("FAIL: one of paths/export/recent was empty", file=sys.stderr)
            return 1
        print("PASS: the Neo4j layer is fully working")
        return 0
    finally:
        if not keep:
            try:
                await cleanup(store)
            except Exception as error:  # noqa: BLE001 - cleanup is best-effort
                print(f"cleanup warning: {error}", file=sys.stderr)
        await store.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--keep", action="store_true", help="leave the smoke nodes in the database")
    raise SystemExit(asyncio.run(main(parser.parse_args().keep)))
