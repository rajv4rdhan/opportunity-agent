"""Intake helpers: document roles, coverage hints and word counts."""

from pathlib import Path

import pytest

from app.services.intake import classify_document, coverage, word_count
from app.tools.pdf import extract_text

SAMPLES = Path(__file__).resolve().parent.parent / "samples"


@pytest.mark.parametrize("name", ["rahul", "arjun", "priya", "meera"])
def test_sample_resumes_and_transcripts_are_classified(name: str):
    resume = extract_text(SAMPLES / name / "resume.pdf")
    transcript = extract_text(SAMPLES / name / "transcript.pdf")

    assert classify_document(resume) == "resume"
    assert classify_document(transcript) == "transcript"


def test_classify_empty_text_defaults_to_resume():
    assert classify_document("") == "resume"


def test_coverage_detects_the_key_facts():
    text = (
        "Final-year B.Tech student. I have 8.2 CGPA and IELTS 7.5. "
        "I want a fully funded master's in AI in Germany or Canada. My budget is low. "
        "I built two projects, see github.com/example."
    )

    assert coverage(text) == {
        "degree": True,
        "grades": True,
        "goal": True,
        "countries": True,
        "budget": True,
        "tests": True,
        "projects": True,
    }


def test_coverage_reports_missing_facts():
    assert coverage("I am a student who likes programming.") == {
        "degree": False,
        "grades": False,
        "goal": False,
        "countries": False,
        "budget": False,
        "tests": False,
        "projects": False,
    }


def test_spoken_numbers_are_not_treated_as_covered():
    # Documented limitation: written numerals are required for grade hints.
    assert coverage("I have eight point two CGPA")["grades"] is False


def test_word_count_ignores_extra_whitespace():
    assert word_count("  one\ttwo   three\n") == 3
    assert word_count(None) == 0
