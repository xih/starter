#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTEXT_DIR="$(mktemp -d)"
SECRETS_FILE="$(mktemp)"

cleanup() {
  [[ -n "${CONTEXT_DIR:-}" ]] && rm -rf "$CONTEXT_DIR"
  [[ -n "${SECRETS_FILE:-}" ]] && rm -f "$SECRETS_FILE"
}
trap cleanup EXIT

required_env=(
  LIVEKIT_URL
  LIVEKIT_API_KEY
  LIVEKIT_API_SECRET
  LIVEKIT_AGENT_TTS_VOICE_ID
)

for name in "${required_env[@]}"; do
  if [[ -z "${!name:-}" ]]; then
    echo "Missing required environment variable: $name" >&2
    exit 1
  fi
done

cp "$ROOT_DIR/Dockerfile" "$CONTEXT_DIR/Dockerfile"
cp "$ROOT_DIR/.dockerignore" "$CONTEXT_DIR/.dockerignore"
cp "$ROOT_DIR/livekit.toml" "$CONTEXT_DIR/livekit.toml"
cp "$ROOT_DIR/pyproject.toml" "$CONTEXT_DIR/pyproject.toml"
cp "$ROOT_DIR/uv.lock" "$CONTEXT_DIR/uv.lock"
mkdir -p "$CONTEXT_DIR/src"
cp "$ROOT_DIR/src/agent.py" "$CONTEXT_DIR/src/agent.py"

{
  printf "LIVEKIT_URL=%s\n" "$LIVEKIT_URL"
  printf "LIVEKIT_API_KEY=%s\n" "$LIVEKIT_API_KEY"
  printf "LIVEKIT_API_SECRET=%s\n" "$LIVEKIT_API_SECRET"
  printf "LIVEKIT_AGENT_NAME=%s\n" "${LIVEKIT_AGENT_NAME:-dennis-portfolio-agent}"
  printf "LIVEKIT_AGENT_STT_MODEL=%s\n" "${LIVEKIT_AGENT_STT_MODEL:-deepgram/nova-3}"
  printf "LIVEKIT_AGENT_STT_LANGUAGE=%s\n" "${LIVEKIT_AGENT_STT_LANGUAGE:-en}"
  printf "LIVEKIT_AGENT_LLM_MODEL=%s\n" "${LIVEKIT_AGENT_LLM_MODEL:-google/gemini-2.5-flash-lite}"
  printf "LIVEKIT_AGENT_TTS_MODEL=%s\n" "${LIVEKIT_AGENT_TTS_MODEL:-cartesia/sonic-3.5}"
  printf "LIVEKIT_AGENT_TTS_VOICE_ID=%s\n" "$LIVEKIT_AGENT_TTS_VOICE_ID"
} > "$SECRETS_FILE"

echo "Deploying LiveKit Cloud Agent from Python-only context: $CONTEXT_DIR"
lk agent deploy --yes --secrets-file "$SECRETS_FILE" "$CONTEXT_DIR"
