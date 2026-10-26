"""Page-level tests with NiceGUI's user simulation (no browser required)."""

from __future__ import annotations

import asyncio
from datetime import date
from pathlib import Path

import pytest
from nicegui import core
from nicegui.testing import user_simulation

from app.config import settings
from app.core import store
from app.core.events import emit
from app.models.opportunity import Opportunity, Requirement, Source
from app.models.profile import StudentProfile, TestScores as Scores
from app.models.report import FinalReport, RunStats, TopMatch

UI_APP = str(Path(__file__).resolve().parent / "ui_app.py")
DESCRIPTION = (
    "I am a final-year B.Tech computer science student with an 8.2 CGPA and IELTS 7.5. "
    "I want a fully funded master's in artificial intelligence in Germany or Canada."
)


@pytest.fixture(autouse=True)
def ignore_storage_clear(monkeypatch):
    # NiceGUI 3.18's reset walks a deleted slot; clearing test storage is unnecessary.
    monkeypatch.setattr(core.app.storage, "clear", lambda: None)


@pytest.fixture
async def seeded_run(monkeypatch, tmp_path):
    monkeypatch.setattr(settings, "data_dir", tmp_path)
    monkeypatch.setattr(store, "_initialized", False)
    await store.init_db()
    run_id = "uitest123456"
    await store.create_run(run_id, "Test Student", {"form": {}}, status="finished")
    opportunity = Opportunity(
        id="test-1",
        name="Test Scholarship",
        provider_org="Test University",
        country="Germany",
        funding_type="full",
        deadline=date(2027, 1, 15),
        official_url="https://example.edu/test",
        verification="verified_official",
        eligibility="eligible",
        score=87,
        requirements=[
            Requirement(
                key="min_gpa",
                description="Minimum GPA 3.0/4.0",
                met="yes",
                evidence="Your 8.2/10 converts to 3.3/4.0",
                quote="A minimum GPA of 3.0 on a 4.0 scale is required.",
            )
        ],
        how_to_apply=["Submit the online form", "Upload transcripts"],
        required_documents=["Transcript", "CV"],
        sources=[
            Source(
                url="https://example.edu/test",
                quote="A minimum GPA of 3.0 on a 4.0 scale is required.",
            )
        ],
    )
    report = FinalReport(
        run_id=run_id,
        profile=StudentProfile(
            name="Test Student",
            current_degree="B.Tech",
            cgpa=8.2,
            target_degree="MS",
            target_countries=["Germany"],
            skills=["python"],
            test_scores=Scores(ielts=7.5),
        ),
        top5=[
            TopMatch(
                rank=1,
                opportunity=opportunity,
                why_it_fits="Your grades and IELTS score meet the published threshold.",
                graph_paths=[["Python", "MEETS", "Test Scholarship"]],
            )
        ],
        all_opportunities=[opportunity],
        sop_for="Test Scholarship",
        sop_markdown="## Statement\n\nI am applying because [ADD: personal story].",
        critic_notes=["Add a concrete research interest."],
        stats=RunStats(
            agents_run=12,
            llm_calls=40,
            tool_calls=109,
            fallbacks=6,
            pages_read=12,
            duration_sec=612,
            est_cost_usd=0.12,
        ),
    )
    await store.update_run(
        run_id,
        status="finished",
        student_name="Test Student",
        report_json=report.model_dump(mode="json"),
    )
    await emit(run_id, "run_started", "Run started")
    await emit(run_id, "agent_finished", "profile_analyst finished", "profile_analyst")
    await emit(run_id, "run_finished", "Finished", data={"top5": 1})
    return run_id


async def test_home_composer_disabled_until_twenty_words():
    async with user_simulation(main_file=UI_APP) as user:
        await user.open("/")
        await user.should_see("Find funding you actually qualify for.")
        submit = user.find(marker="composer-submit").elements.pop()
        assert submit.enabled is False

        user.find(marker="composer-text").type(DESCRIPTION)
        await asyncio.sleep(0.7)
        assert submit.enabled is True
        await user.should_see("✓ Degree")
        await user.should_see("✓ Countries")


async def test_finished_run_shows_summary_and_top_match(seeded_run):
    async with user_simulation(main_file=UI_APP) as user:
        await user.open(f"/runs/{seeded_run}")
        await user.should_see("Results")
        await user.should_see("Test Scholarship")
        await user.should_see("87% match")
        await user.should_see("Minimum GPA 3.0/4.0")


async def test_replay_mode_renders_controls(seeded_run):
    async with user_simulation(main_file=UI_APP) as user:
        await user.open(f"/runs/{seeded_run}?replay=1&speed=20")
        await user.should_see("Replay ×20")
        await asyncio.sleep(1.0)
        await user.should_see("Results")
