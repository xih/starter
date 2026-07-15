from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from web_search import (  # noqa: E402
    create_default_http_client,
    create_search_provider,
    load_web_search_settings,
)
from web_search_providers import ParallelSearchProvider  # noqa: E402


class FakeHttpClient:
    pass


class WebSearchConfigTests(unittest.TestCase):
    def test_loads_parallel_as_default_provider_from_environment(self) -> None:
        settings = load_web_search_settings(
            {
                "PARALLEL_API_KEY": "parallel-key",
                "WEB_SEARCH_MAX_RESULTS": "7",
                "WEB_SEARCH_TIMEOUT_SECONDS": "4.5",
            }
        )

        self.assertEqual(settings.provider, "parallel")
        self.assertEqual(settings.api_key, "parallel-key")
        self.assertEqual(settings.max_results, 7)
        self.assertEqual(settings.timeout_seconds, 4.5)

    def test_create_search_provider_uses_selected_provider_only(self) -> None:
        settings = load_web_search_settings(
            {
                "WEB_SEARCH_PROVIDER": "parallel",
                "PARALLEL_API_KEY": "parallel-key",
                "EXA_API_KEY": "",
                "PERPLEXITY_API_KEY": "",
            }
        )

        provider = create_search_provider(settings, http_client=FakeHttpClient())

        self.assertIsInstance(provider, ParallelSearchProvider)

    def test_selected_provider_requires_its_matching_api_key(self) -> None:
        with self.assertRaisesRegex(ValueError, "EXA_API_KEY is missing"):
            load_web_search_settings(
                {
                    "WEB_SEARCH_PROVIDER": "exa",
                    "PARALLEL_API_KEY": "parallel-key",
                }
            )

    def test_unknown_provider_is_rejected_before_agent_startup(self) -> None:
        with self.assertRaisesRegex(ValueError, "Unsupported web search provider"):
            load_web_search_settings(
                {
                    "WEB_SEARCH_PROVIDER": "unknown-search",
                    "PARALLEL_API_KEY": "parallel-key",
                }
            )

    def test_default_http_client_uses_httpx_async_client(self) -> None:
        client = create_default_http_client()

        self.assertEqual(client.__class__.__name__, "AsyncClient")


if __name__ == "__main__":
    unittest.main()
