from __future__ import annotations

import json
import logging
from json import JSONDecodeError
from typing import Protocol

from web_search import SearchResult

logger = logging.getLogger(__name__)


class SearchProvider(Protocol):
    name: str

    async def search(
        self,
        query: str,
        max_results: int,
        timeout_seconds: float,
    ) -> list[SearchResult]: ...


class SearchToolStatusNotifier:
    async def started(self, summary: str, provider: str) -> None:
        return None

    async def finished(self) -> None:
        return None

    async def failed(self, message: str) -> None:
        return None


class LiveKitRpcSearchToolStatusNotifier(SearchToolStatusNotifier):
    def __init__(self, room: object) -> None:
        self.room = room
        self.active_provider: str | None = None
        self.active_summary: str | None = None

    async def _send(self, payload: dict[str, str]) -> None:
        remote_participants = getattr(self.room, "remote_participants", {})
        if not remote_participants:
            return

        destination_identity = next(iter(remote_participants))
        try:
            await self.room.local_participant.perform_rpc(
                destination_identity=destination_identity,
                method="livekit_agent_tool_status",
                payload=json.dumps(payload),
                response_timeout=5,
            )
        except Exception:
            logger.warning(
                "Failed to send LiveKit tool status RPC",
                exc_info=True,
                extra={"payload_state": payload.get("state")},
            )

    async def started(self, summary: str, provider: str) -> None:
        self.active_summary = summary
        self.active_provider = provider
        await self._send(
            {
                "provider": provider,
                "state": "running",
                "summary": summary,
            }
        )

    async def finished(self) -> None:
        await self._send(
            {
                "state": "completed",
            }
        )

    async def failed(self, message: str) -> None:
        payload = {"error": message, "state": "failed"}
        if self.active_provider:
            payload["provider"] = self.active_provider
        if self.active_summary:
            payload["summary"] = self.active_summary
        await self._send(payload)


def _format_results(results: list[SearchResult]) -> str:
    if not results:
        return "Web search completed, but no useful results were found."

    lines = ["Web search results:"]
    for index, result in enumerate(results, start=1):
        dated = f" ({result.published_at})" if result.published_at else ""
        lines.append(
            f"{index}. {result.title}{dated} - {result.snippet} Source: {result.url}"
        )
    return "\n".join(lines)


async def run_web_search_tool(
    summary: str,
    query: str,
    provider: SearchProvider,
    notifier: SearchToolStatusNotifier,
    max_results: int,
    timeout_seconds: float,
) -> str:
    await notifier.started(summary, provider.name)

    try:
        results = await provider.search(
            query=query,
            max_results=max_results,
            timeout_seconds=timeout_seconds,
        )
    except Exception as error:
        message = _safe_error_message(error)
        await notifier.failed(message)
        if "API_KEY is missing" in message:
            return f"Web search is not configured: {message}."
        return f"Web search failed: {message}."

    await notifier.finished()
    return _format_results(results)


def _safe_error_message(error: Exception) -> str:
    if isinstance(error, JSONDecodeError):
        return "provider returned malformed data"
    return str(error) or error.__class__.__name__
