from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from agent import PortfolioAgent  # noqa: E402
from agent_web_search import SearchToolStatusNotifier  # noqa: E402
from web_search import SearchResult, WebSearchSettings  # noqa: E402


class FakeProvider:
    name = "parallel"

    async def search(
        self,
        query: str,
        max_results: int,
        timeout_seconds: float,
    ) -> list[SearchResult]:
        return [
            SearchResult(
                title="LiveKit Function Tools",
                url="https://docs.livekit.io/agents/logic/tools/definition/",
                snippet="Add tools with the function_tool decorator.",
                published_at=None,
                provider="parallel",
            )
        ]


class FakeHttpClient:
    def __init__(self) -> None:
        self.closed = False

    async def __aenter__(self) -> "FakeHttpClient":
        return self

    async def __aexit__(self, exc_type, exc, tb) -> None:
        self.closed = True


class RecordingNotifier(SearchToolStatusNotifier):
    def __init__(self) -> None:
        self.started_calls: list[tuple[str, str]] = []

    async def started(self, summary: str, provider: str) -> None:
        self.started_calls.append((summary, provider))


class PortfolioAgentToolTests(unittest.IsolatedAsyncioTestCase):
    async def test_search_web_tool_delegates_to_configured_provider(self) -> None:
        notifier = RecordingNotifier()
        agent = PortfolioAgent(
            agent_id="dennis-portfolio-agent",
            instructions="Test agent.",
            search_settings=WebSearchSettings(
                provider="parallel",
                api_key="parallel-key",
                max_results=3,
                timeout_seconds=2,
            ),
            provider_factory=lambda _settings, _http_client: FakeProvider(),
            notifier_factory=lambda: notifier,
        )

        result = await agent.search_web(
            context=None,
            summary="Find current LiveKit tool docs",
            query="LiveKit Python function_tool docs",
        )

        self.assertIn("LiveKit Function Tools", result)
        self.assertIn("https://docs.livekit.io/agents/logic/tools/definition/", result)
        self.assertEqual(
            notifier.started_calls,
            [("Find current LiveKit tool docs", "parallel")],
        )

    def test_search_web_is_registered_as_livekit_function_tool(self) -> None:
        tool = PortfolioAgent.search_web

        self.assertIn("function", tool.__class__.__name__.lower())

    async def test_search_web_closes_default_http_client(self) -> None:
        notifier = RecordingNotifier()
        http_client = FakeHttpClient()
        agent = PortfolioAgent(
            agent_id="dennis-portfolio-agent",
            instructions="Test agent.",
            search_settings=WebSearchSettings(
                provider="parallel",
                api_key="parallel-key",
                max_results=3,
                timeout_seconds=2,
            ),
            http_client_factory=lambda: http_client,
            provider_factory=lambda _settings, _http_client: FakeProvider(),
            notifier_factory=lambda: notifier,
        )

        await agent.search_web(
            context=None,
            summary="Find current LiveKit tool docs",
            query="LiveKit Python function_tool docs",
        )

        self.assertTrue(http_client.closed)


if __name__ == "__main__":
    unittest.main()
