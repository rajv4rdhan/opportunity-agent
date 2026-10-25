"""Pure profile-merging logic from the GitHub Enricher."""

from app.agents.github_enricher import _merge_into_profile
from app.models.profile import GitHubInsights, Project, StudentProfile

REPOS = {
    "Alpha": {"name": "Alpha", "html_url": "https://github.com/u/Alpha", "stargazers_count": 4},
    "Beta": {"name": "Beta", "html_url": "https://github.com/u/Beta", "stargazers_count": 2},
}
LANGUAGES = {"Beta": {"Python": 100}}


def test_skills_are_deduped_case_insensitively():
    profile = StudentProfile(name="Test", skills=["Python"])
    insights = GitHubInsights(username="u", inferred_skills=["python", "PyTorch"])

    merged = _merge_into_profile(profile, insights, REPOS, LANGUAGES)

    assert merged.skills == ["Python", "PyTorch"]


def test_hidden_gems_match_repo_names_case_insensitively():
    profile = StudentProfile(name="Test", projects=[Project(name="alpha")])
    insights = GitHubInsights(username="u", hidden_gems=["ALPHA", "beta"])

    merged = _merge_into_profile(profile, insights, REPOS, LANGUAGES)

    assert [project.name for project in merged.projects] == ["alpha", "Beta"]
    assert merged.projects[1].tech == ["Python"]
    assert merged.projects[1].source == "github"
