from datetime import date, timedelta

from app.config import settings
from app.graph.routing import after_critic, after_matcher, after_profile, fan_out_verifiers
from app.models.opportunity import Candidate, Opportunity
from app.models.profile import StudentProfile


def profile(**overrides) -> StudentProfile:
    data = {
        "name": "Test",
        "nationality": "India",
        "target_countries": ["Germany"],
        "target_degree": "MS",
        "target_fields": ["Computer Science"],
    }
    data.update(overrides)
    return StudentProfile(**data)


def opportunity(index: int, eligibility: str = "eligible", verification: str = "verified_official") -> Opportunity:
    return Opportunity(
        id=f"opp-{index}",
        name=f"Opportunity {index}",
        provider_org="University",
        kind="scholarship",
        funding_type="full",
        official_url="https://example.edu",
        verification=verification,
        eligibility=eligibility,
        deadline=date.today() + timedelta(days=60),
        confidence=1.0,
    )


def test_after_profile():
    assert after_profile({"profile": profile()}) == "github_enricher"
    assert after_profile({"profile": profile(target_countries=[])}) == "clarifier"
    assert after_profile({}) == "end"


def test_after_matcher_targets_met():
    state = {
        "opportunities": [opportunity(i, "eligible" if i < 5 else "partial") for i in range(10)],
        "scout_round": 1,
    }
    assert after_matcher(state) == "ranker"


def test_after_matcher_replans_when_short():
    state = {"opportunities": [opportunity(i) for i in range(9)], "scout_round": 1}
    assert after_matcher(state) == "planner"


def test_after_matcher_stops_at_round_limit():
    state = {"opportunities": [opportunity(i) for i in range(9)], "scout_round": settings.max_scout_rounds}
    assert after_matcher(state) == "ranker"


def test_after_matcher_requires_enough_good():
    state = {
        "opportunities": [opportunity(i, "eligible" if i < 4 else "not_eligible") for i in range(10)],
        "scout_round": 1,
    }
    assert after_matcher(state) == "planner"


def test_after_critic_loop_limit():
    assert after_critic({"critic_passed": True, "sop_revisions": 0}) == "finalizer"
    assert after_critic({"critic_passed": False, "sop_revisions": 0}) == "sop_writer"
    assert after_critic({"critic_passed": False, "sop_revisions": settings.max_sop_revisions}) == "finalizer"


def test_fan_out_verifiers():
    candidate = Candidate(title="X", url="https://x.edu", provider="tavily", query="q")
    sends = fan_out_verifiers(
        {"run_id": "run1", "chaos": {}, "profile": profile(), "pending_verify": [candidate]}
    )
    assert len(sends) == 1
    assert sends[0].node == "verifier"
    assert sends[0].arg["candidate"].url == "https://x.edu"


def test_fan_out_without_candidates_goes_to_matcher():
    sends = fan_out_verifiers({"run_id": "run1", "chaos": {}, "profile": profile(), "pending_verify": []})
    assert sends[0].node == "matcher"
