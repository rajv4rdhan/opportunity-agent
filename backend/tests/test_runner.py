"""Runner helpers that can be tested without starting a graph."""

from pathlib import Path

import pytest

from app.config import BACKEND_DIR, settings
from app.core import store
from app.models.inputs import RunForm
from app.models.profile import TestScores as Scores
from app.services import runner
from app.services.runner import merge_sample_form
from app.tools.pdf import extract_text

SAMPLE = {
    "github_url": "https://github.com/example",
    "target_countries": ["Germany", "Canada"],
    "target_degree": "MS",
    "target_fields": ["Computer Science"],
    "nationality": "India",
    "budget_inr_per_year": 1_500_000,
    "test_scores": {"ielts": None, "gre": 320.0},
    "notes": "sample note",
}


def test_sample_form_fills_blank_fields():
    form = RunForm(sample="demo", nationality="Nepal", test_scores=Scores(ielts=7.0))
    merged = merge_sample_form(form, SAMPLE)

    assert merged.sample == "demo"
    assert merged.github_url == "https://github.com/example"
    assert merged.target_countries == ["Germany", "Canada"]
    assert merged.nationality == "Nepal"
    assert merged.test_scores.ielts == 7.0
    assert merged.test_scores.gre == 320.0


def test_explicit_values_win_and_chaos_is_kept():
    form = RunForm(
        sample="demo",
        target_countries=["Singapore"],
        target_degree="PhD",
        chaos={"fetch_timeout": True},
    )
    merged = merge_sample_form(form, {**SAMPLE, "chaos": {"search_primary_down": True}})

    assert merged.target_countries == ["Singapore"]
    assert merged.target_degree == "PhD"
    assert merged.target_fields == ["Computer Science"]
    assert merged.chaos == {"fetch_timeout": True}


@pytest.fixture
def isolated_run(monkeypatch, tmp_path):
    monkeypatch.setattr(settings, "data_dir", tmp_path)
    monkeypatch.setattr(store, "_initialized", False)
    monkeypatch.setattr(runner, "start_run", lambda *args, **kwargs: None)
    return tmp_path


DESCRIPTION = (
    "I am a final-year computer science student in India with an 8.2 CGPA and IELTS 7.5. "
    "I want a fully funded master's in artificial intelligence in Germany or Canada, "
    "and my budget is low. I have built several machine learning projects."
)


async def test_create_run_accepts_a_description_only(isolated_run):
    run_id = await runner.create_run(RunForm(description=DESCRIPTION), None, None)
    run = await store.get_run(run_id)

    assert run is not None
    assert run["inputs"]["resume_path"] is None
    assert run["inputs"]["transcript_path"] is None
    assert run["inputs"]["form"]["description"] == DESCRIPTION


async def test_create_run_rejects_an_empty_intake(isolated_run):
    with pytest.raises(ValueError, match="Add a resume"):
        await runner.create_run(RunForm(), None, None)


async def test_sample_run_still_works(isolated_run):
    run_id = await runner.create_run(RunForm(sample="rahul"), None, None)
    run = await store.get_run(run_id)

    assert run["inputs"]["resume_path"].endswith("samples/rahul/resume.pdf")


async def test_uploaded_documents_are_swapped_into_the_right_roles(isolated_run):
    resume = BACKEND_DIR / "samples" / "rahul" / "resume.pdf"
    transcript = BACKEND_DIR / "samples" / "rahul" / "transcript.pdf"

    # The caller sends them in the wrong order on purpose.
    run_id = await runner.create_run(RunForm(description=DESCRIPTION), transcript, resume)
    run = await store.get_run(run_id)
    inputs = run["inputs"]

    assert "Academic Transcript" not in extract_text(Path(inputs["resume_path"]))
    assert "Academic Transcript" in extract_text(Path(inputs["transcript_path"]))


async def test_a_single_transcript_is_accepted(isolated_run):
    transcript = BACKEND_DIR / "samples" / "rahul" / "transcript.pdf"

    run_id = await runner.create_run(RunForm(), transcript, None)
    run = await store.get_run(run_id)

    assert run["inputs"]["resume_path"] is None
    assert run["inputs"]["transcript_path"].endswith("transcript.pdf")

