from __future__ import annotations

import sys
import unittest
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from web_search import SearchProviderConfig
from web_search_providers import (  # noqa: E402
    ExaSearchProvider,
    ParallelSearchProvider,
    PerplexitySearchProvider,
)


class FakeResponse:
    def __init__(self, payload: dict[str, Any], status_code: int = 200) -> None:
        self._payload = payload
        self.status_code = status_code

    def json(self) -> dict[str, Any]:
        return self._payload


class FakeHttpClient:
    def __init__(self, payload: dict[str, Any], status_code: int = 200) -> None:
        self.payload = payload
        self.status_code = status_code
        self.calls: list[dict[str, Any]] = []

    async def post(self, *args: Any, **kwargs: Any) -> FakeResponse:
        self.calls.append({"args": args, "kwargs": kwargs})
        return FakeResponse(self.payload, self.status_code)


class MalformedHttpClient(FakeHttpClient):
    async def post(self, *args: Any, **kwargs: Any) -> FakeResponse:
        self.calls.append({"args": args, "kwargs": kwargs})
        return FakeResponse({"unexpected": []})


class SearchProviderTests(unittest.IsolatedAsyncioTestCase):
    async def test_parallel_search_returns_normalized_results(self) -> None:
        http_client = FakeHttpClient(
            {
                "results": [
                    {
                        "title": "Parallel Search API",
                        "url": "https://docs.parallel.ai/api-reference/search/search",
                        "excerpts": ["Ranked web URLs with compressed excerpts."],
                        "publish_date": "2026-07-01",
                    }
                ]
            }
        )
        provider = ParallelSearchProvider(
            SearchProviderConfig(api_key="parallel-key"),
            http_client=http_client,
        )

        results = await provider.search(
            query="Parallel Search API pricing",
            max_results=5,
            timeout_seconds=8,
        )

        self.assertEqual(len(results), 1)
        self.assertEqual(results[0].provider, "parallel")
        self.assertEqual(
            http_client.calls[0]["args"],
            ("https://api.parallel.ai/v1/search",),
        )
        self.assertEqual(
            http_client.calls[0]["kwargs"]["headers"]["x-api-key"],
            "parallel-key",
        )
        self.assertNotIn("Authorization", http_client.calls[0]["kwargs"]["headers"])
        self.assertEqual(
            http_client.calls[0]["kwargs"]["json"],
            {
                "objective": "Parallel Search API pricing",
                "search_queries": ["Parallel Search API pricing"],
                "mode": "turbo",
                "max_chars_total": 3000,
            },
        )
        self.assertEqual(results[0].title, "Parallel Search API")
        self.assertEqual(
            results[0].url,
            "https://docs.parallel.ai/api-reference/search/search",
        )
        self.assertEqual(
            results[0].snippet,
            "Ranked web URLs with compressed excerpts.",
        )
        self.assertEqual(results[0].published_at, "2026-07-01")

    async def test_exa_search_returns_normalized_results(self) -> None:
        http_client = FakeHttpClient(
            {
                "results": [
                    {
                        "title": "Exa Search API",
                        "url": "https://exa.ai/docs/reference/search-api-guide",
                        "highlights": [
                            "Exa provides configurable latency for AI search."
                        ],
                        "publishedDate": "2026-06-30",
                    }
                ]
            }
        )
        provider = ExaSearchProvider(
            SearchProviderConfig(api_key="exa-key"),
            http_client=http_client,
        )

        results = await provider.search(
            query="Exa Search API latency",
            max_results=5,
            timeout_seconds=8,
        )

        self.assertEqual(len(results), 1)
        self.assertEqual(results[0].provider, "exa")
        self.assertEqual(http_client.calls[0]["args"], ("https://api.exa.ai/search",))
        self.assertEqual(
            http_client.calls[0]["kwargs"]["headers"]["x-api-key"],
            "exa-key",
        )
        self.assertEqual(
            http_client.calls[0]["kwargs"]["json"],
            {
                "query": "Exa Search API latency",
                "numResults": 5,
                "type": "fast",
                "contents": {"highlights": True},
            },
        )
        self.assertEqual(results[0].title, "Exa Search API")
        self.assertEqual(
            results[0].url,
            "https://exa.ai/docs/reference/search-api-guide",
        )
        self.assertEqual(
            results[0].snippet,
            "Exa provides configurable latency for AI search.",
        )
        self.assertEqual(results[0].published_at, "2026-06-30")

    async def test_perplexity_search_returns_normalized_results(self) -> None:
        http_client = FakeHttpClient(
            {
                "results": [
                    {
                        "title": "Perplexity Search API Quickstart",
                        "url": "https://docs.perplexity.ai/docs/search/quickstart",
                        "snippet": "Search API charges per request only.",
                        "date": "2026-07-02",
                    }
                ]
            }
        )
        provider = PerplexitySearchProvider(
            SearchProviderConfig(api_key="perplexity-key"),
            http_client=http_client,
        )

        results = await provider.search(
            query="Perplexity Search API pricing",
            max_results=5,
            timeout_seconds=8,
        )

        self.assertEqual(len(results), 1)
        self.assertEqual(results[0].provider, "perplexity")
        self.assertEqual(
            http_client.calls[0]["args"],
            ("https://api.perplexity.ai/search",),
        )
        self.assertEqual(
            http_client.calls[0]["kwargs"]["headers"]["Authorization"],
            "Bearer perplexity-key",
        )
        self.assertEqual(
            http_client.calls[0]["kwargs"]["json"],
            {
                "query": "Perplexity Search API pricing",
                "max_results": 5,
                "search_context_size": "low",
            },
        )
        self.assertEqual(results[0].title, "Perplexity Search API Quickstart")
        self.assertEqual(
            results[0].url,
            "https://docs.perplexity.ai/docs/search/quickstart",
        )
        self.assertEqual(results[0].snippet, "Search API charges per request only.")
        self.assertEqual(results[0].published_at, "2026-07-02")

    async def test_missing_provider_key_returns_safe_provider_error(self) -> None:
        provider = ParallelSearchProvider(
            SearchProviderConfig(api_key=""),
            http_client=FakeHttpClient({"results": []}),
        )

        with self.assertRaisesRegex(ValueError, "PARALLEL_API_KEY is missing"):
            await provider.search(
                query="current LiveKit tool docs",
                max_results=5,
                timeout_seconds=8,
            )

    async def test_unexpected_response_shape_raises_provider_error(self) -> None:
        provider = ParallelSearchProvider(
            SearchProviderConfig(api_key="parallel-key"),
            http_client=MalformedHttpClient({"unexpected": []}),
        )

        with self.assertRaisesRegex(ValueError, "parallel returned malformed data"):
            await provider.search(
                query="current LiveKit tool docs",
                max_results=5,
                timeout_seconds=8,
            )


if __name__ == "__main__":
    unittest.main()
