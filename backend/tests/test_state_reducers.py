from app.models.opportunity import Candidate, Opportunity
from app.models.state import add_unique_candidates, merge_by_id


def make_opp(opp_id: str, name: str, score: float = 0.0) -> Opportunity:
    return Opportunity(
        id=opp_id,
        name=name,
        provider_org="Test University",
        kind="scholarship",
        funding_type="full",
        official_url="https://example.edu",
        verification="verified_official",
        score=score,
    )


def test_merge_by_id_replaces_and_keeps_order():
    current = [make_opp("a", "A", 1), make_opp("b", "B", 2)]
    incoming = [make_opp("b", "B updated", 9), make_opp("c", "C", 3)]
    merged = merge_by_id(current, incoming)
    assert [item.id for item in merged] == ["a", "b", "c"]
    assert merged[1].name == "B updated"
    assert merged[1].score == 9


def test_add_unique_candidates_dedupes_normalised_urls():
    current = [
        Candidate(title="One", url="https://www.example.edu/a?utm_source=x", provider="tavily", query="q")
    ]
    incoming = [
        Candidate(title="Duplicate", url="https://example.edu/a", provider="exa", query="q"),
        Candidate(title="New", url="https://example.edu/b", provider="exa", query="q"),
    ]
    merged = add_unique_candidates(current, incoming)
    assert [item.title for item in merged] == ["One", "New"]
