from datetime import date, datetime, timedelta

import pytest

from app.core import store
from app.models.opportunity import Opportunity, Requirement
from app.models.profile import StudentProfile
from app.models.report import FinalReport
from app.services import matching


def make_profile(**overrides) -> StudentProfile:
    data = {
        "name": "Test Student",
        "cgpa": 8.2,
        "cgpa_scale": 10.0,
        "skills": ["Python", "PyTorch"],
        "target_countries": ["Germany"],
        "target_degree": "MS",
        "nationality": "India",
    }
    data.update(overrides)
    return StudentProfile(**data)


def make_opportunity(requirements=None, **overrides) -> Opportunity:
    data = {
        "id": "test-opp",
        "name": "Test MS",
        "provider_org": "Test University",
        "country": "Germany",
        "kind": "program",
        "funding_type": "full",
        "official_url": "https://www.test.edu/ms",
        "verification": "verified_official",
        "confidence": 1.0,
        "deadline": date.today() + timedelta(days=90),
        "requirements": requirements or [],
        "valued_skills": ["Python"],
    }
    data.update(overrides)
    return Opportunity(**data)


def test_gpa_conversion_across_scales():
    requirement = Requirement(key="min_gpa", description="GPA 3.0/4.0", numeric_value=3.0, numeric_scale=4.0)
    result = matching.evaluate_requirement(requirement, make_profile())
    assert result.met == "yes"
    assert "8.2/10" in result.evidence


def test_missing_ielts_is_not_met_but_partial():
    requirement = Requirement(
        key="english_test", description="IELTS 6.5", test_name="IELTS", numeric_value=6.5
    )
    opportunity = matching.evaluate_opportunity(make_opportunity([requirement]), make_profile())
    assert opportunity.requirements[0].met == "no"
    assert opportunity.eligibility == "partial"
    assert "IELTS" in opportunity.missing[0]


def test_ielts_waiver_becomes_unknown():
    requirement = Requirement(
        key="english_test",
        description="English requirement may be waived for medium of instruction",
        test_name="IELTS",
        numeric_value=6.5,
    )
    result = matching.evaluate_requirement(requirement, make_profile())
    assert result.met == "unknown"


def test_nationality_failure_is_not_eligible():
    requirement = Requirement(key="nationality", description="Open to EU citizens only", met="no")
    opportunity = matching.evaluate_opportunity(make_opportunity([requirement]), make_profile())
    assert opportunity.eligibility == "not_eligible"


def test_expired_is_not_eligible():
    opportunity = matching.evaluate_opportunity(
        make_opportunity(is_expired=True), make_profile()
    )
    assert opportunity.eligibility == "not_eligible"
    assert opportunity.score == 0


def test_score_orders_stronger_match_first():
    strong = matching.evaluate_opportunity(make_opportunity(), make_profile())
    weak = matching.evaluate_opportunity(
        make_opportunity(
            id="weak",
            funding_type="unknown",
            verification="unverified",
            confidence=0.4,
            valued_skills=[],
            deadline=date.today() + timedelta(days=5),
        ),
        make_profile(),
    )
    assert strong.score > weak.score


def test_gaps_group_same_requirement():
    requirement = Requirement(
        key="english_test", description="IELTS 6.5", test_name="IELTS", numeric_value=6.5
    )
    first = matching.evaluate_opportunity(make_opportunity([requirement], id="a", name="A"), make_profile())
    second = matching.evaluate_opportunity(make_opportunity([requirement], id="b", name="B"), make_profile())
    gaps = matching.compute_gaps([first, second])
    assert len(gaps) == 1
    assert gaps[0].requirement == "IELTS >= 6.5"
    assert gaps[0].unlocks == ["A", "B"]


async def test_whatif_override_unlocks(tmp_path, monkeypatch):
    monkeypatch.setattr("app.config.settings.data_dir", tmp_path)
    store._initialized = False
    await store.init_db()

    requirement = Requirement(
        key="english_test", description="IELTS 6.5", test_name="IELTS", numeric_value=6.5
    )
    profile = make_profile()
    before = matching.evaluate_opportunity(make_opportunity([requirement]), profile)
    assert before.eligibility == "partial"
    report = FinalReport(run_id="run1", profile=profile, all_opportunities=[before])
    await store.create_run("run1", profile.name, {})
    await store.update_run("run1", report_json=report.model_dump(mode="json"), status="finished")

    after, gaps = await matching.whatif("run1", {"test_scores.ielts": 7.0})
    assert after[0].eligibility == "eligible"
    assert after[0].requirements[0].met == "yes"
    assert gaps == []
