from __future__ import annotations

import json
import logging
from json import JSONDecodeError
from typing import Protocol

from web_search import SearchResult

logger = logging.getLogger(__name__)

MAX_STATUS_SOURCES = 5
MAX_STATUS_SOURCE_TITLE_CHARS = 160
MAX_STATUS_SOURCE_DESCRIPTION_CHARS = 280
MAX_STATUS_SOURCE_URL_CHARS = 2_048
LIVEKIT_RPC_MAX_PAYLOAD_BYTES = 15 * 1024
MAX_STATUS_RPC_PAYLOAD_BYTES = 14 * 1024


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

    async def finished(self, results: list[SearchResult]) -> None:
        return None

    async def failed(self, message: str) -> None:
        return None


class LiveKitRpcSearchToolStatusNotifier(SearchToolStatusNotifier):
    def __init__(self, room: object) -> None:
        self.room = room
        self.active_provider: str | None = None
        self.active_summary: str | None = None

    async def _send(self, payload: dict[str, object]) -> None:
        remote_participants = getattr(self.room, "remote_participants", {})
        if not remote_participants:
            return

        destination_identity = next(iter(remote_participants))
        payload_json = _fit_rpc_payload(payload)
        try:
            await self.room.local_participant.perform_rpc(
                destination_identity=destination_identity,
                method="livekit_agent_tool_status",
                payload=payload_json,
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

    async def finished(self, results: list[SearchResult]) -> None:
        sources = []
        for result in results:
            url = _get_status_source_url(result.url)
            if not url:
                continue

            sources.append(
                {
                    "description": _truncate_status_text(
                        result.snippet or "",
                        MAX_STATUS_SOURCE_DESCRIPTION_CHARS,
                    ),
                    "provider": result.provider or "",
                    "published_at": result.published_at,
                    "title": _truncate_status_text(
                        result.title or "",
                        MAX_STATUS_SOURCE_TITLE_CHARS,
                    ),
                    "url": url,
                }
            )
            if len(sources) >= MAX_STATUS_SOURCES:
                break

        payload: dict[str, object] = {
            "sources": sources,
            "state": "completed",
        }
        if self.active_provider:
            payload["provider"] = self.active_provider
        if self.active_summary:
            payload["summary"] = self.active_summary
        await self._send(payload)

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

    await notifier.finished(results)
    return _format_results(results)


def _safe_error_message(error: Exception) -> str:
    if isinstance(error, JSONDecodeError):
        return "provider returned malformed data"
    return str(error) or error.__class__.__name__


def _truncate_status_text(value: str, max_chars: int) -> str:
    if len(value) <= max_chars:
        return value
    return f"{value[: max_chars - 3].rstrip()}..."


def _get_status_source_url(value: str) -> str:
    if len(value) > MAX_STATUS_SOURCE_URL_CHARS:
        return ""
    return value


def _fit_rpc_payload(payload: dict[str, object]) -> str:
    payload_json = _dump_rpc_payload(payload)
    if _payload_bytes(payload_json) <= MAX_STATUS_RPC_PAYLOAD_BYTES:
        return payload_json

    fitted = dict(payload)
    sources = fitted.get("sources")
    if isinstance(sources, list):
        fitted["sources"] = list(sources)
        while fitted["sources"]:
            payload_json = _dump_rpc_payload(fitted)
            if _payload_bytes(payload_json) <= MAX_STATUS_RPC_PAYLOAD_BYTES:
                return payload_json
            fitted["sources"].pop()

    for key in ("summary", "error"):
        if isinstance(fitted.get(key), str):
            fitted[key] = _truncate_payload_field(fitted, key)
            payload_json = _dump_rpc_payload(fitted)
            if _payload_bytes(payload_json) <= MAX_STATUS_RPC_PAYLOAD_BYTES:
                return payload_json

    minimal_payload = _minimal_status_payload(fitted)
    payload_json = _dump_rpc_payload(minimal_payload)
    if _payload_bytes(payload_json) <= LIVEKIT_RPC_MAX_PAYLOAD_BYTES:
        return payload_json

    return _dump_rpc_payload({"state": str(payload.get("state") or "completed")})


def _truncate_payload_field(payload: dict[str, object], key: str) -> str:
    value = str(payload.get(key) or "")
    low = 0
    high = len(value)
    best = ""

    while low <= high:
        mid = (low + high) // 2
        candidate = _truncate_status_text(value, max(mid, 3))
        test_payload = {**payload, key: candidate}
        if _payload_bytes(_dump_rpc_payload(test_payload)) <= MAX_STATUS_RPC_PAYLOAD_BYTES:
            best = candidate
            low = mid + 1
        else:
            high = mid - 1

    return best


def _minimal_status_payload(payload: dict[str, object]) -> dict[str, object]:
    state = str(payload.get("state") or "completed")
    minimal: dict[str, object] = {"state": state}
    provider = payload.get("provider")
    if isinstance(provider, str):
        minimal["provider"] = _truncate_status_text(provider, 80)
    if state in {"running", "completed", "failed"}:
        minimal["summary"] = "Web search"
    if state == "failed":
        minimal["error"] = "Search failed."
    return minimal


def _dump_rpc_payload(payload: dict[str, object]) -> str:
    return json.dumps(payload, ensure_ascii=False, separators=(",", ":"))


def _payload_bytes(payload_json: str) -> int:
    return len(payload_json.encode("utf-8"))
