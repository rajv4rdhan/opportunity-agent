"""GitHub Enricher: public repos → skills, notable projects, hidden gems."""

from __future__ import annotations

import asyncio

from app.core.agent import AgentCtx, agent
from app.core.events import emit
from app.core.fallback import AllProvidersFailed
from app.models.profile import GitHubInsights, Project
from app.tools import github

SOURCE = "github_enricher"


def _username(profile) -> str | None:
    found = github.parse_username(profile.github_url)
    if found:
        return found
    for link in profile.other_links:
        if "github.com" in (link or ""):
            found = github.parse_username(link)
            if found:
                return found
    return None


def _merge_into_profile(profile, insights: GitHubInsights, repos: dict[str, dict], languages: dict[str, dict]):
    skills = {skill.casefold() for skill in profile.skills}
    for skill in insights.inferred_skills:
        if skill and skill.casefold() not in skills:
            profile.skills.append(skill)
            skills.add(skill.casefold())

    repos_by_name = {name.casefold(): repo for name, repo in repos.items()}
    existing = {project.name.casefold() for project in profile.projects}
    for gem in insights.hidden_gems:
        repo = repos.get(gem) or repos_by_name.get(gem.casefold())
        if repo is None or repo["name"].casefold() in existing:
            continue
        profile.projects.append(
            Project(
                name=repo["name"],
                description=repo.get("description") or "",
                tech=sorted(languages.get(repo["name"], {}).keys()),
                url=repo.get("html_url"),
                stars=repo.get("stargazers_count"),
                source="github",
            )
        )
        existing.add(repo["name"].casefold())
    return profile


@agent("github_enricher")
async def github_enricher(state: dict, ctx: AgentCtx) -> dict:
    profile = state["profile"]
    username = _username(profile)
    if not username:
        await emit(ctx.run_id, "agent_skipped", "No GitHub profile provided", SOURCE)
        return {"github": None}

    try:
        user = await github.get_user(ctx, username)
        repos_list = await github.get_repos(ctx, username)
    except AllProvidersFailed as error:
        await emit(
            ctx.run_id,
            "agent_skipped",
            f"GitHub enrichment skipped: {error}",
            SOURCE,
            error=str(error),
        )
        return {"github": None}

    repos = {repo["name"]: repo for repo in repos_list}
    top = github.top_repos(repos_list, 8)
    results = await asyncio.gather(
        *[github.get_languages(ctx, username, repo["name"]) for repo in top],
        *[github.get_readme(ctx, username, repo["name"]) for repo in top],
        return_exceptions=True,
    )
    languages = {
        repo["name"]: (results[index] if isinstance(results[index], dict) else {})
        for index, repo in enumerate(top)
    }
    readmes = {
        repo["name"]: (results[len(top) + index] if isinstance(results[len(top) + index], str) else "")
        for index, repo in enumerate(top)
    }

    payload = [
        {
            "name": repo["name"],
            "description": repo.get("description") or "",
            "stars": repo.get("stargazers_count", 0),
            "language": repo.get("language") or "",
            "pushed_at": repo.get("pushed_at") or "",
            "languages": languages.get(repo["name"], {}),
            "readme_excerpt": readmes.get(repo["name"], ""),
        }
        for repo in top
    ]
    insights = await ctx.llm(
        "github_insights",
        GitHubInsights,
        tier="fast",
        profile=profile,
        repos_json=payload,
        resume_projects=profile.projects,
    )

    # API facts always win over the model's recollection.
    insights.username = username
    insights.public_repos = user.get("public_repos", len(repos_list))
    insights.followers = user.get("followers", 0)
    insights.top_languages = {
        language: sum(langs.get(language, 0) for langs in languages.values())
        for language in {name for langs in languages.values() for name in langs}
    }

    profile = _merge_into_profile(profile, insights, repos, languages)
    await ctx.log(
        f"Found {len(insights.hidden_gems)} repo(s) not in the resume: {', '.join(insights.hidden_gems[:5])}"
    )
    return {"github": insights, "profile": profile}
