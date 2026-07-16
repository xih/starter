from __future__ import annotations

from typing import Any

try:
    from .web_search import SearchProviderConfig, SearchResult
except ImportError:
    from web_search import SearchProviderConfig, SearchResult


def _first_text(value: Any) -> str:
    if isinstance(value, str):
        return value
    if isinstance(value, list):
        return " ".join(item for item in value if isinstance(item, str)).strip()
    return ""


class _BaseSearchProvider:
    name: str
    missing_key_name: str

    def __init__(self, config: SearchProviderConfig, http_client: Any) -> None:
        self.config = config
        self.http_client = http_client

    async def search(
        self,
        query: str,
        max_results: int,
        timeout_seconds: float,
    ) -> list[SearchResult]:
        if not self.config.api_key:
            raise ValueError(f"{self.missing_key_name} is missing")

        response = await self.http_client.post(
            self.endpoint,
            json=self._request_body(query=query, max_results=max_results),
            headers=self._headers(),
            timeout=timeout_seconds,
        )
        if response.status_code >= 400:
            raise ValueError(
                f"{self.name} search failed with HTTP {response.status_code}"
            )

        payload = response.json()
        results = payload.get("results")
        if not isinstance(results, list):
            raise ValueError(f"{self.name} returned malformed data")

        return [self._normalize_result(item) for item in results]

    def _request_body(self, query: str, max_results: int) -> dict[str, Any]:
        return {"query": query, "max_results": max_results}

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.config.api_key}",
            "Content-Type": "application/json",
        }

    def _normalize_result(self, item: dict[str, Any]) -> SearchResult:
        raise NotImplementedError


class ParallelSearchProvider(_BaseSearchProvider):
    name = "parallel"
    missing_key_name = "PARALLEL_API_KEY"
    endpoint = "https://api.parallel.ai/v1/search"

    def _headers(self) -> dict[str, str]:
        return {
            "x-api-key": self.config.api_key,
            "Content-Type": "application/json",
        }

    def _request_body(self, query: str, max_results: int) -> dict[str, Any]:
        return {
            "objective": query,
            "search_queries": [query],
            "mode": "turbo",
            "max_chars_total": max_results * 600,
        }

    def _normalize_result(self, item: dict[str, Any]) -> SearchResult:
        return SearchResult(
            title=str(item.get("title") or ""),
            url=str(item.get("url") or ""),
            snippet=_first_text(item.get("excerpts") or item.get("snippet")),
            published_at=item.get("publish_date") or item.get("published_date"),
            provider=self.name,
        )


class ExaSearchProvider(_BaseSearchProvider):
    name = "exa"
    missing_key_name = "EXA_API_KEY"
    endpoint = "https://api.exa.ai/search"

    def _headers(self) -> dict[str, str]:
        return {
            "x-api-key": self.config.api_key,
            "Content-Type": "application/json",
        }

    def _request_body(self, query: str, max_results: int) -> dict[str, Any]:
        return {
            "query": query,
            "numResults": max_results,
            "type": "fast",
            "contents": {"highlights": True},
        }

    def _normalize_result(self, item: dict[str, Any]) -> SearchResult:
        return SearchResult(
            title=str(item.get("title") or ""),
            url=str(item.get("url") or ""),
            snippet=_first_text(
                item.get("highlights") or item.get("text") or item.get("snippet")
            ),
            published_at=item.get("publishedDate"),
            provider=self.name,
        )


class PerplexitySearchProvider(_BaseSearchProvider):
    name = "perplexity"
    missing_key_name = "PERPLEXITY_API_KEY"
    endpoint = "https://api.perplexity.ai/search"

    def _request_body(self, query: str, max_results: int) -> dict[str, Any]:
        return {
            "query": query,
            "max_results": max_results,
            "search_context_size": "low",
        }

    def _normalize_result(self, item: dict[str, Any]) -> SearchResult:
        return SearchResult(
            title=str(item.get("title") or ""),
            url=str(item.get("url") or ""),
            snippet=_first_text(item.get("snippet")),
            published_at=item.get("date"),
            provider=self.name,
        )
