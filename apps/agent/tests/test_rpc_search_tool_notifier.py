from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from agent_web_search import LiveKitRpcSearchToolStatusNotifier  # noqa: E402
from web_search import SearchResult  # noqa: E402


class FakeLocalParticipant:
    def __init__(self) -> None:
        self.calls: list[dict[str, object]] = []

    async def perform_rpc(
        self,
        destination_identity: str,
        method: str,
        payload: str,
        response_timeout: float,
    ) -> str:
        self.calls.append(
            {
                "destination_identity": destination_identity,
                "method": method,
                "payload": json.loads(payload),
                "response_timeout": response_timeout,
            }
        )
        return "ok"


class FailingLocalParticipant(FakeLocalParticipant):
    async def perform_rpc(
        self,
        destination_identity: str,
        method: str,
        payload: str,
        response_timeout: float,
    ) -> str:
        await super().perform_rpc(
            destination_identity=destination_identity,
            method=method,
            payload=payload,
            response_timeout=response_timeout,
        )
        raise TimeoutError("browser did not respond")


class FakeRoom:
    def __init__(self) -> None:
        self.local_participant = FakeLocalParticipant()
        self.remote_participants = {"browser-user": object()}


class FailingRoom(FakeRoom):
    def __init__(self) -> None:
        super().__init__()
        self.local_participant = FailingLocalParticipant()


class RpcSearchToolNotifierTests(unittest.IsolatedAsyncioTestCase):
    async def test_started_sends_search_status_to_browser_rpc(self) -> None:
        room = FakeRoom()
        notifier = LiveKitRpcSearchToolStatusNotifier(room)

        await notifier.started("Comparing search provider pricing", "parallel")

        self.assertEqual(
            room.local_participant.calls,
            [
                {
                    "destination_identity": "browser-user",
                    "method": "livekit_agent_tool_status",
                    "payload": {
                        "provider": "parallel",
                        "state": "running",
                        "summary": "Comparing search provider pricing",
                    },
                    "response_timeout": 5,
                }
            ],
        )

    async def test_finished_sends_sources_to_browser_rpc_status(self) -> None:
        room = FakeRoom()
        notifier = LiveKitRpcSearchToolStatusNotifier(room)

        await notifier.started("Find today's match result", "parallel")
        await notifier.finished(
            [
                SearchResult(
                    title="Argentina beats England",
                    url="https://example.com/argentina-england",
                    snippet="Argentina beat England 2-1 after goals from...",
                    published_at="2026-07-15",
                    provider="parallel",
                )
            ]
        )

        self.assertEqual(
            room.local_participant.calls[-1]["payload"],
            {
                "provider": "parallel",
                "sources": [
                    {
                        "description": "Argentina beat England 2-1 after goals from...",
                        "provider": "parallel",
                        "published_at": "2026-07-15",
                        "title": "Argentina beats England",
                        "url": "https://example.com/argentina-england",
                    }
                ],
                "state": "completed",
                "summary": "Find today's match result",
            },
        )

    async def test_failed_sends_provider_summary_and_error(self) -> None:
        room = FakeRoom()
        notifier = LiveKitRpcSearchToolStatusNotifier(room)

        await notifier.started("Comparing search provider pricing", "parallel")
        await notifier.failed("provider timed out")

        self.assertEqual(
            room.local_participant.calls[-1]["payload"],
            {
                "error": "provider timed out",
                "provider": "parallel",
                "state": "failed",
                "summary": "Comparing search provider pricing",
            },
        )

    async def test_rpc_errors_do_not_abort_status_notifications(self) -> None:
        room = FailingRoom()
        notifier = LiveKitRpcSearchToolStatusNotifier(room)

        with self.assertLogs("agent_web_search", level="WARNING") as logs:
            await notifier.started("Comparing search provider pricing", "parallel")

        self.assertEqual(len(room.local_participant.calls), 1)
        self.assertIn("Failed to send LiveKit tool status RPC", logs.output[0])


if __name__ == "__main__":
    unittest.main()
