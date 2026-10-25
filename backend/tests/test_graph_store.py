"""In-memory graph behaviour that is shared with the Neo4j export shape."""

from datetime import date

from app.models.opportunity import Opportunity, Requirement
from app.models.profile import Project, StudentProfile
from app.tools.graph_store import MemoryStore, _memory_graph


def sample_opportunity() -> Opportunity:
    return Opportunity(
        id="opp-1",
        name="Test Scholarship",
        provider_org="Test University",
        country="Germany",
        funding_type="full",
        official_url="https://example.edu/test",
        verification="verified_official",
        confidence=0.9,
        deadline=date(2027, 1, 15),
        valued_skills=["Python"],
        requirements=[
            Requirement(key="min_gpa", description="GPA 3.0/4.0", numeric_value=3.0, numeric_scale=4.0)
        ],
        eligibility="eligible",
        score=75,
    )


async def test_export_includes_project_skills_and_organisation_country():
    _memory_graph.clear()
    store = MemoryStore()
    profile = StudentProfile(
        name="Test Student",
        skills=["Python"],
        projects=[Project(name="Test Project", tech=["Python"])],
    )
    opportunity = sample_opportunity()

    await store.upsert_student("student-1", profile, None)
    await store.upsert_opportunity(opportunity)
    await store.link_eligibility("student-1", opportunity)
    data = await store.export("student-1")

    labels = {node["label"] for node in data["nodes"]}
    relation_types = {link["type"] for link in data["links"]}
    assert {"Test Student", "Test Project", "Germany", "Test Scholarship"} <= labels
    assert {"BUILT", "USES", "OFFERED_BY", "LOCATED_IN", "MATCHED"} <= relation_types


async def test_export_does_not_leak_another_student_via_a_shared_skill():
    _memory_graph.clear()
    store = MemoryStore()
    opportunity = sample_opportunity()
    first = StudentProfile(name="First Student", skills=["Python"])
    second = StudentProfile(name="Second Student", skills=["Python"])

    await store.upsert_student("student-1", first, None)
    await store.upsert_student("student-2", second, None)
    await store.upsert_opportunity(opportunity)
    await store.link_eligibility("student-1", opportunity)
    await store.link_eligibility("student-2", opportunity)

    data = await store.export("student-1")

    ids = {node["id"] for node in data["nodes"]}
    assert "student-1" in ids
    assert "student-2" not in ids
