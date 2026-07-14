from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping

import httpx

from web_search_constants import (
    DEFAULT_WEB_SEARCH_MAX_RESULTS,
    DEFAULT_WEB_SEARCH_PROVIDER,
    DEFAULT_WEB_SEARCH_TIMEOUT_SECONDS,
    EXA_PROVIDER,
    PARALLEL_PROVIDER,
    PERPLEXITY_PROVIDER,
    PROVIDER_SECRET_NAMES,
    WEB_SEARCH_MAX_RESULTS_ENV,
    WEB_SEARCH_PROVIDER_ENV,
    WEB_SEARCH_TIMEOUT_SECONDS_ENV,
)


@dataclass(frozen=True)
class SearchProviderConfig:
    api_key: str


@dataclass(frozen=True)
class SearchResult:
    title: str
    url: str
    snippet: str
    published_at: str | None
    provider: str


@dataclass(frozen=True)
class WebSearchSettings:
    provider: str
    api_key: str
    max_results: int
    timeout_seconds: float


def load_web_search_settings(env: Mapping[str, str | None]) -> WebSearchSettings:
    provider = (
        env.get(WEB_SEARCH_PROVIDER_ENV) or DEFAULT_WEB_SEARCH_PROVIDER
    ).strip().lower()
    secret_name = PROVIDER_SECRET_NAMES.get(provider)
    if not secret_name:
        raise ValueError(f"Unsupported web search provider: {provider}")

    api_key = env.get(secret_name) or ""
    if not api_key:
        raise ValueError(f"{secret_name} is missing")

    return WebSearchSettings(
        provider=provider,
        api_key=api_key,
        max_results=int(
            env.get(WEB_SEARCH_MAX_RESULTS_ENV) or DEFAULT_WEB_SEARCH_MAX_RESULTS
        ),
        timeout_seconds=float(
            env.get(WEB_SEARCH_TIMEOUT_SECONDS_ENV)
            or DEFAULT_WEB_SEARCH_TIMEOUT_SECONDS
        ),
    )


def create_search_provider(settings: WebSearchSettings, http_client: Any) -> Any:
    from web_search_providers import (  # noqa: PLC0415
        ExaSearchProvider,
        ParallelSearchProvider,
        PerplexitySearchProvider,
    )

    config = SearchProviderConfig(api_key=settings.api_key)
    if settings.provider == PARALLEL_PROVIDER:
        return ParallelSearchProvider(config, http_client=http_client)
    if settings.provider == EXA_PROVIDER:
        return ExaSearchProvider(config, http_client=http_client)
    if settings.provider == PERPLEXITY_PROVIDER:
        return PerplexitySearchProvider(config, http_client=http_client)

    raise ValueError(f"Unsupported web search provider: {settings.provider}")


def create_default_http_client() -> httpx.AsyncClient:
    return httpx.AsyncClient()
