"""Document classification and word counts used by the intake pipeline."""

from pathlib import Path

import pytest

from app.services.intake import classify_document, word_count
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


def test_word_count_ignores_extra_whitespace():
    assert word_count("  one\ttwo   three\n") == 3
    assert word_count(None) == 0
