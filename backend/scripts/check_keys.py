"""Verify every configured provider. Prints status only — never prints keys."""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import httpx  # noqa: E402
import litellm  # noqa: E402

from app.config import settings  # noqa: E402
from app.tools.github import resolve_token  # noqa: E402

litellm.suppress_debug_info = True

OK, BAD, SKIP = "✅", "❌", "⚪"
TIMEOUT = 45


def line(name: str, status: str, detail: str = "") -> str:
    return f"{status}  {name:<10} {detail}"


async def check_llm() -> tuple[str, str]:
    if not settings.model_fast:
        return BAD, "no MODEL_FAST configured"
    try:
        headers = (
            {
                "x-opencode-session": "scholarswarm-check",
                "User-Agent": "ScholarSwarm/1.0",
            }
            if settings.llm_api_base and "opencode.ai" in settings.llm_api_base
            else None
        )
        response = await litellm.acompletion(
            model=settings.model_fast,
            messages=[{"role": "user", "content": "Reply with exactly: OK"}],
            max_tokens=64,
            timeout=60,
            api_base=settings.llm_api_base,
            api_key=settings.llm_api_key,
            extra_headers=headers,
        )
        text = (response.choices[0].message.content or "").strip()
        return OK, f"{settings.model_fast} → {text[:20]!r}"
    except Exception as error:  # noqa: BLE001
        return BAD, str(error).splitlines()[0][:160]


async def check_tavily() -> tuple[str, str]:
    if not settings.tavily_api_key:
        return SKIP, "not configured"
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            response = await client.post(
                "https://api.tavily.com/search",
                headers={"Authorization": f"Bearer {settings.tavily_api_key}"},
                json={"query": "test", "max_results": 1, "search_depth": "basic"},
            )
            response.raise_for_status()
            count = len(response.json().get("results", []))
            return OK, f"{count} result(s)"
    except Exception as error:  # noqa: BLE001
        return BAD, str(error)[:160]


async def check_exa() -> tuple[str, str]:
    if not settings.exa_api_key:
        return SKIP, "not configured"
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            response = await client.post(
                "https://api.exa.ai/search",
                headers={"x-api-key": settings.exa_api_key},
                json={"query": "test", "numResults": 1, "type": "auto"},
            )
            response.raise_for_status()
            return OK, f"{len(response.json().get('results', []))} result(s)"
    except Exception as error:  # noqa: BLE001
        return BAD, str(error)[:160]


async def check_serper() -> tuple[str, str]:
    if not settings.serper_api_key:
        return SKIP, "not configured"
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            response = await client.post(
                "https://google.serper.dev/search",
                headers={"X-API-KEY": settings.serper_api_key},
                json={"q": "test", "num": 1},
            )
            response.raise_for_status()
            return OK, f"{len(response.json().get('organic', []))} result(s)"
    except Exception as error:  # noqa: BLE001
        return BAD, str(error)[:160]


async def check_jina() -> tuple[str, str]:
    try:
        headers = {"X-Return-Format": "markdown"}
        if settings.jina_api_key:
            headers["Authorization"] = f"Bearer {settings.jina_api_key}"
        async with httpx.AsyncClient(timeout=TIMEOUT, follow_redirects=True) as client:
            response = await client.get("https://r.jina.ai/https://example.com", headers=headers)
            response.raise_for_status()
            return OK, f"{len(response.text)} chars"
    except Exception as error:  # noqa: BLE001
        return BAD, str(error)[:160]


async def check_firecrawl() -> tuple[str, str]:
    if not settings.firecrawl_api_key:
        return SKIP, "not configured"
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            response = await client.post(
                "https://api.firecrawl.dev/v1/scrape",
                headers={"Authorization": f"Bearer {settings.firecrawl_api_key}"},
                json={"url": "https://example.com", "formats": ["markdown"], "onlyMainContent": True},
            )
            response.raise_for_status()
            markdown = (response.json().get("data") or {}).get("markdown", "")
            return OK, f"{len(markdown)} chars"
    except Exception as error:  # noqa: BLE001
        return BAD, str(error)[:160]


async def check_kernel() -> tuple[str, str]:
    if not settings.kernel_api_key:
        return SKIP, "not configured"
    from kernel import AsyncKernel

    client = AsyncKernel(api_key=settings.kernel_api_key)
    try:
        created = await client.browsers.create(timeout_seconds=120)
        await client.browsers.delete_by_id(created.session_id)
        return OK, f"session {created.session_id[:8]}… created and deleted"
    except Exception as error:  # noqa: BLE001
        return BAD, str(error)[:160]
    finally:
        await client.close()


async def check_github() -> tuple[str, str]:
    token = resolve_token()
    headers = {"Accept": "application/vnd.github+json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            response = await client.get("https://api.github.com/rate_limit", headers=headers)
            response.raise_for_status()
            remaining = response.json()["resources"]["core"]["remaining"]
            mode = "authenticated" if token else "unauthenticated"
            return OK, f"{mode}, {remaining} requests left"
    except Exception as error:  # noqa: BLE001
        return BAD, str(error)[:160]


async def check_neo4j() -> tuple[str, str]:
    if not settings.configured("neo4j"):
        return SKIP, "not configured (in-memory fallback)"
    from neo4j import AsyncGraphDatabase
    from neo4j.exceptions import AuthError, ServiceUnavailable

    driver = AsyncGraphDatabase.driver(
        settings.neo4j_uri, auth=(settings.neo4j_username, settings.neo4j_password)
    )
    try:
        await driver.verify_connectivity()
        async with driver.session() as session:
            result = await session.run("RETURN 1 AS ok")
            record = await result.single()
        return OK, f"RETURN {record['ok']}"
    except AuthError:
        return BAD, "authentication failed — reset the AuraDB password and update NEO4J_PASSWORD"
    except ServiceUnavailable:
        return BAD, "instance unreachable — is the AuraDB instance running?"
    except Exception as error:  # noqa: BLE001
        return BAD, str(error)[:160]
    finally:
        await driver.close()


async def check_langfuse() -> tuple[str, str]:
    if not (settings.langfuse_public_key and settings.langfuse_secret_key):
        return SKIP, "not configured"
    host = (settings.langfuse_host or "https://cloud.langfuse.com").rstrip("/")
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            response = await client.get(
                f"{host}/api/public/projects",
                auth=(settings.langfuse_public_key, settings.langfuse_secret_key),
            )
            response.raise_for_status()
            return OK, "authenticated"
    except Exception as error:  # noqa: BLE001
        return BAD, str(error)[:160]


CHECKS = [
    ("llm", check_llm, True),
    ("tavily", check_tavily, True),
    ("exa", check_exa, False),
    ("serper", check_serper, False),
    ("jina", check_jina, False),
    ("firecrawl", check_firecrawl, False),
    ("kernel", check_kernel, True),
    ("github", check_github, True),
    ("neo4j", check_neo4j, bool(settings.configured("neo4j"))),
    ("langfuse", check_langfuse, False),
]


async def main() -> int:
    settings.export_env()
    failed: list[str] = []
    print(f"ScholarSwarm key check — {settings.model_smart}\n")
    for name, check, required in CHECKS:
        try:
            status, detail = await check()
        except Exception as error:  # noqa: BLE001 - a crashed check is a failed check
            status, detail = BAD, str(error)[:160]
        print(line(name, status, detail))
        if status == BAD and required:
            failed.append(name)

    print()
    if failed:
        print(f"Required providers failing: {', '.join(failed)}")
        return 1
    print("All required providers are working.")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
