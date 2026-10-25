"""Runner helpers that can be tested without starting a graph."""

from app.models.inputs import RunForm
from app.models.profile import TestScores as Scores
from app.services.runner import merge_sample_form

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
