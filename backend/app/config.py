"""Application configuration — the ONLY place environment settings are read."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# Keep onnxruntime's device-discovery warnings out of the CLI/UI output.
os.environ.setdefault("ORT_LOGGING_LEVEL", "3")

BACKEND_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BACKEND_DIR / "data"

PROVIDERS = (
    "llm",
    "tavily",
    "exa",
    "serper",
    "jina",
    "firecrawl",
    "kernel",
    "github",
    "neo4j",
    "langfuse",
)


class Settings(BaseSettings):
    """Runtime settings loaded from backend/.env and the process environment."""

    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # ---------- LLM ----------
    # LiteLLM model strings, e.g. "openai/deepseek-v4.1-flash".
    model_smart: str = "openai/deepseek-v4.1-flash"
    model_fast: str = "openai/muse-spark-1.3"
    model_fallback: str | None = None

    # Any OpenAI-compatible gateway. Both our canonical names and the
    # OPENAPI_COMP_* names used in .env are accepted.
    llm_api_base: str | None = Field(
        default=None,
        validation_alias=AliasChoices("LLM_API_BASE", "OPENAPI_COMP_URL"),
    )
    llm_api_key: str | None = Field(
        default=None,
        validation_alias=AliasChoices("LLM_API_KEY", "OPENAPI_COMP_KEY"),
    )

    anthropic_api_key: str | None = None
    openai_api_key: str | None = None
    gemini_api_key: str | None = None

    # ---------- Search ----------
    tavily_api_key: str | None = None
    exa_api_key: str | None = None
    serper_api_key: str | None = None

    # ---------- Fetching / browser ----------
    jina_api_key: str | None = None
    firecrawl_api_key: str | None = None
    kernel_api_key: str | None = None

    # ---------- Profile enrichment ----------
    github_token: str | None = None

    # ---------- Knowledge graph ----------
    neo4j_uri: str | None = None
    neo4j_username: str | None = None
    neo4j_password: str | None = None

    # ---------- Tracing ----------
    langfuse_public_key: str | None = None
    langfuse_secret_key: str | None = None
    langfuse_host: str | None = None

    # ---------- App ----------
    data_dir: Path = DATA_DIR
    storage_secret: str = "change-me"
    ui_poll_seconds: float = 0.5

    # ---------- Swarm tunables ----------
    max_candidates_per_round: int = 15
    max_scout_rounds: int = 3
    min_verified_target: int = 10
    min_eligible_target: int = 5
    verifier_concurrency: int = 5
    max_sop_revisions: int = 2
    page_char_limit: int = 15000
    cache_ttl_hours: int = 72
    run_timeout_minutes: int = 15

    def configured(self, provider: str) -> bool:
        """True when the provider has everything it needs to be called."""
        if provider == "llm":
            return bool(self.llm_api_key or self.anthropic_api_key or self.openai_api_key or self.gemini_api_key)
        if provider == "jina":
            return True  # Reader works without a key at a lower rate limit.
        if provider == "neo4j":
            return bool(self.neo4j_uri and self.neo4j_username and self.neo4j_password)
        if provider == "langfuse":
            return bool(self.langfuse_public_key and self.langfuse_secret_key)
        return bool(getattr(self, f"{provider}_api_key", None))

    def export_env(self) -> None:
        """Expose keys to libraries that read os.environ directly (LiteLLM, Neo4j)."""
        mapping: dict[str, Any] = {
            "ANTHROPIC_API_KEY": self.anthropic_api_key,
            "OPENAI_API_KEY": self.openai_api_key,
            "GEMINI_API_KEY": self.gemini_api_key,
            "GITHUB_TOKEN": self.github_token,
            "TAVILY_API_KEY": self.tavily_api_key,
            "EXA_API_KEY": self.exa_api_key,
            "SERPER_API_KEY": self.serper_api_key,
            "JINA_API_KEY": self.jina_api_key,
            "FIRECRAWL_API_KEY": self.firecrawl_api_key,
            "KERNEL_API_KEY": self.kernel_api_key,
            "NEO4J_URI": self.neo4j_uri,
            "NEO4J_USERNAME": self.neo4j_username,
            "NEO4J_PASSWORD": self.neo4j_password,
            "LANGFUSE_PUBLIC_KEY": self.langfuse_public_key,
            "LANGFUSE_SECRET_KEY": self.langfuse_secret_key,
            "LANGFUSE_HOST": self.langfuse_host,
        }
        for name, value in mapping.items():
            if value:
                os.environ.setdefault(name, str(value))


settings = Settings()
