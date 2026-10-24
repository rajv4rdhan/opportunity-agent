"""GitHub API tools: profile, repos, languages and READMEs."""

from __future__ import annotations

import functools
import re
import subprocess
from typing import TYPE_CHECKING, Any

from app.config import settings
from app.core.events import emit
from app.core.fallback import AllProvidersFailed, first_success
from app.core.http import http_get_json, http_get_text
from app.core.utils import truncate

if TYPE_CHECKING:
    from app.core.agent import AgentCtx

BASE = "https://api.github.com"
USERNAME_RE = re.compile(r"^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$")


@functools.lru_cache(maxsize=1)
def resolve_token() -> str | None:
    """Token from settings/env, else the gh CLI login if available."""
    if settings.github_token:
        return settings.github_token
    try:
        result = subprocess.run(
            ["gh", "auth", "token"], capture_output=True, text=True, timeout=5, check=False
        )
    except (FileNotFoundError, subprocess.SubprocessError):
        return None
    token = result.stdout.strip()
    return token or None


def parse_username(url_or_name: str | None) -> str | None:
    if not url_or_name:
        return None
    value = url_or_name.strip().rstrip("/")
    if "github.com" in value:
        value = value.split("github.com", 1)[1].lstrip("/:/")
        value = value.split("/", 1)[0].split("?", 1)[0]
    return value if USERNAME_RE.match(value) else None


def _headers(authenticated: bool) -> dict[str, str]:
    headers = {"Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"}
    token = resolve_token()
    if authenticated and token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


async def _api_json(
    ctx: "AgentCtx",
    path: str,
    *,
    authenticated: bool = True,
    allow_empty: bool = False,
) -> Any:
    async def authed() -> Any:
        return await http_get_json(f"{BASE}{path}", headers=_headers(authenticated))

    async def anonymous() -> Any:
        return await http_get_json(f"{BASE}{path}", headers=_headers(False))

    attempts = []
    if resolve_token():
        attempts.append(("api", authed))
    attempts.append(("api_anon", anonymous))
    empty_check = (lambda value: value is None) if allow_empty else (lambda value: not value)
    return await first_success(ctx, "github", attempts, retries_each=1, is_empty=empty_check)


async def get_user(ctx: "AgentCtx", username: str) -> dict:
    return await _api_json(ctx, f"/users/{username}")


async def get_repos(ctx: "AgentCtx", username: str) -> list[dict]:
    repos = await _api_json(ctx, f"/users/{username}/repos?per_page=100&sort=updated", allow_empty=True)
    return [repo for repo in repos if not repo.get("fork")]


async def get_languages(ctx: "AgentCtx", owner: str, repo: str) -> dict[str, int]:
    try:
        return await _api_json(ctx, f"/repos/{owner}/{repo}/languages", allow_empty=True)
    except AllProvidersFailed:
        return {}


async def get_readme(ctx: "AgentCtx", owner: str, repo: str) -> str:
    try:
        text = await http_get_text(
            f"{BASE}/repos/{owner}/{repo}/readme",
            headers={**_headers(True), "Accept": "application/vnd.github.raw"},
        )
        return truncate(text, 3000)
    except Exception as error:  # noqa: BLE001 - a missing README is normal
        await emit(ctx.run_id, "log", f"No README for {owner}/{repo}: {error}", ctx.agent)
        return ""


def top_repos(repos: list[dict], limit: int = 8) -> list[dict]:
    return sorted(
        repos,
        key=lambda repo: (repo.get("stargazers_count", 0), repo.get("pushed_at") or ""),
        reverse=True,
    )[:limit]
