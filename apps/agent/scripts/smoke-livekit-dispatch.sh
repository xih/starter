#!/usr/bin/env bash
set -euo pipefail

AGENT_NAME="${LIVEKIT_AGENT_NAME:-dennis-portfolio-agent}"
ROOM_NAME="${LIVEKIT_SMOKE_ROOM_NAME:-agent_smoke_$(date +%s)}"
TIMEOUT_SECONDS="${LIVEKIT_SMOKE_TIMEOUT_SECONDS:-60}"
POLL_SECONDS="${LIVEKIT_SMOKE_POLL_SECONDS:-5}"

cleanup() {
  lk room delete "$ROOM_NAME" >/dev/null 2>&1 || true
}

trap cleanup EXIT

echo "room=$ROOM_NAME"
echo "agent=$AGENT_NAME"

lk dispatch create --room "$ROOM_NAME" --agent-name "$AGENT_NAME"

deadline=$((SECONDS + TIMEOUT_SECONDS))
while (( SECONDS < deadline )); do
  echo "--- dispatches ---"
  lk dispatch list "$ROOM_NAME" || true

  echo "--- participants ---"
  participants="$(lk room participants list "$ROOM_NAME" 2>&1 || true)"
  echo "$participants"

  if grep -Eq 'agent[-_][A-Za-z0-9]+' <<<"$participants"; then
    echo "LiveKit smoke passed: agent participant joined."
    exit 0
  fi

  sleep "$POLL_SECONDS"
done

echo "LiveKit smoke failed: no agent participant joined within ${TIMEOUT_SECONDS}s." >&2
exit 1
