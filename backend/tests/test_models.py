from datetime import date

from app.models.opportunity import Opportunity, Requirement
from app.models.profile import StudentProfile, TestScores as Scores


def test_opportunity_normalizes_llm_wording():
    opportunity = Opportunity(
        name="Test Scholarship",
        provider_org="Test University",
        funding_type="Fully funded",
        kind="Masters program",
        deadline="15 January 2027",
        verification="official page",
        degree_levels=None,
    )
    assert opportunity.funding_type == "full"
    assert opportunity.kind == "program"
    assert opportunity.deadline == date(2027, 1, 15)
    assert opportunity.verification == "verified_official"
    assert opportunity.degree_levels == []


def test_requirement_aliases():
    requirement = Requirement(key="IELTS", description="IELTS 6.5", met="met", numeric_value="6.5")
    assert requirement.key == "english_test"
    assert requirement.met == "yes"
    assert requirement.numeric_value == 6.5

    gpa = Requirement(key="GPA", description="GPA 3.0/4.0", numeric_scale="4.0", numeric_value="3.0")
    assert gpa.key == "min_gpa"
    assert gpa.numeric_scale == 4.0


def test_test_scores_accept_na():
    scores = Scores(ielts="N/A", toefl="108", gre="not taken")
    assert scores.ielts is None
    assert scores.toefl == 108.0
    assert scores.gre is None


def test_profile_accepts_nulls_for_lists_and_defaults_scale():
    profile = StudentProfile(name="Test", skills=None, projects=None, cgpa_scale=None, work_experience_years=None)
    assert profile.skills == []
    assert profile.projects == []
    assert profile.cgpa_scale == 10.0
    assert profile.work_experience_years == 0
