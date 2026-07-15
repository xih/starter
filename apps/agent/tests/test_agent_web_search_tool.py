from __future__ import annotations

import sys
import unittest
from pathlib import Path
from json import JSONDecodeError

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from agent_web_search import SearchToolStatusNotifier, run_web_search_tool  # noqa: E402
from web_search import SearchResult  # noqa: E402


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
                title="Parallel Pricing",
                url="https://parallel.ai/pricing",
                snippet="Search API costs $0.001 - $0.005 per request for 10 results.",
                published_at=None,
                provider="parallel",
            )
        ]


class FailingProvider:
    name = "parallel"

    async def search(
        self,
        query: str,
        max_results: int,
        timeout_seconds: float,
    ) -> list[SearchResult]:
        raise ValueError("PARALLEL_API_KEY is missing")


class TimeoutProvider:
    name = "parallel"

    async def search(
        self,
        query: str,
        max_results: int,
        timeout_seconds: float,
    ) -> list[SearchResult]:
        raise TimeoutError("provider timed out")


class MalformedProvider:
    name = "parallel"

    async def search(
        self,
        query: str,
        max_results: int,
        timeout_seconds: float,
    ) -> list[SearchResult]:
        raise JSONDecodeError("Expecting value", "", 0)


class RecordingNotifier(SearchToolStatusNotifier):
    def __init__(self) -> None:
        self.events: list[tuple[str, str]] = []

    async def started(self, summary: str, provider: str) -> None:
        self.events.append(("started", f"{provider}:{summary}"))

    async def finished(self) -> None:
        self.events.append(("finished", ""))

    async def failed(self, message: str) -> None:
        self.events.append(("failed", message))


class AgentWebSearchToolTests(unittest.IsolatedAsyncioTestCase):
    async def test_tool_returns_compact_cited_search_result(self) -> None:
        notifier = RecordingNotifier()

        result = await run_web_search_tool(
            summary="Compare search provider pricing",
            query="Parallel Search API pricing",
            provider=FakeProvider(),
            notifier=notifier,
            max_results=5,
            timeout_seconds=8,
        )

        self.assertIn("Parallel Pricing", result)
        self.assertIn("https://parallel.ai/pricing", result)
        self.assertIn("$0.001 - $0.005", result)
        self.assertIn(
            ("started", "parallel:Compare search provider pricing"),
            notifier.events,
        )
        self.assertIn(("finished", ""), notifier.events)

    async def test_tool_returns_safe_message_for_missing_provider_key(self) -> None:
        notifier = RecordingNotifier()

        result = await run_web_search_tool(
            summary="Look up current docs",
            query="LiveKit tool calling docs",
            provider=FailingProvider(),
            notifier=notifier,
            max_results=5,
            timeout_seconds=8,
        )

        self.assertEqual(
            result,
            "Web search is not configured: PARALLEL_API_KEY is missing.",
        )
        self.assertIn(("failed", "PARALLEL_API_KEY is missing"), notifier.events)

    async def test_tool_returns_safe_message_for_provider_timeouts(self) -> None:
        notifier = RecordingNotifier()

        result = await run_web_search_tool(
            summary="Look up current docs",
            query="LiveKit tool calling docs",
            provider=TimeoutProvider(),
            notifier=notifier,
            max_results=5,
            timeout_seconds=8,
        )

        self.assertEqual(
            result,
            "Web search failed: provider timed out.",
        )
        self.assertIn(("failed", "provider timed out"), notifier.events)

    async def test_tool_returns_safe_message_for_malformed_response(self) -> None:
        notifier = RecordingNotifier()

        result = await run_web_search_tool(
            summary="Look up current docs",
            query="LiveKit tool calling docs",
            provider=MalformedProvider(),
            notifier=notifier,
            max_results=5,
            timeout_seconds=8,
        )

        self.assertEqual(
            result,
            "Web search failed: provider returned malformed data.",
        )
        self.assertIn(("failed", "provider returned malformed data"), notifier.events)


if __name__ == "__main__":
    unittest.main()
