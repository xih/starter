#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTEXT_DIR="$(mktemp -d)"
SECRETS_FILE="$(mktemp)"
DRY_RUN="${LIVEKIT_AGENT_DEPLOY_DRY_RUN:-0}"
INFISICAL_PROJECT_ID="${INFISICAL_PROJECT_ID:-}"
INFISICAL_ENV="${INFISICAL_ENV:-prod}"
INFISICAL_PATH="${INFISICAL_PATH:-/}"
INFISICAL_BOOTSTRAPPED="${LIVEKIT_AGENT_DEPLOY_INFISICAL_BOOTSTRAPPED:-0}"
SKIP_INFISICAL="${LIVEKIT_AGENT_DEPLOY_SKIP_INFISICAL:-0}"

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
  CARTESIA_API_KEY
  OPENAI_API_KEY
  LIVEKIT_AGENT_PERSONA_BASE_URL
  PERSONA_AGENT_READ_SECRET
  PARALLEL_API_KEY
  EXA_API_KEY
  PERPLEXITY_API_KEY
)

if [[ "$INFISICAL_BOOTSTRAPPED" != "1" && "$SKIP_INFISICAL" != "1" ]]; then
  if ! command -v infisical >/dev/null 2>&1; then
    echo "Missing infisical CLI. Install/login to Infisical or set LIVEKIT_AGENT_DEPLOY_SKIP_INFISICAL=1 for a local dry run." >&2
    exit 1
  fi

  infisical_args=(run --env="$INFISICAL_ENV" --path="$INFISICAL_PATH")
  if [[ -n "$INFISICAL_PROJECT_ID" ]]; then
    infisical_args+=(--projectId "$INFISICAL_PROJECT_ID")
  fi

  exec env LIVEKIT_AGENT_DEPLOY_INFISICAL_BOOTSTRAPPED=1 infisical \
    "${infisical_args[@]}" \
    -- "$0" "$@"
fi

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
cp -R "$ROOT_DIR/src" "$CONTEXT_DIR/src"

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
  printf "OPENAI_AGENT_STT_MODEL=%s\n" "${OPENAI_AGENT_STT_MODEL:-whisper-1}"
  printf "OPENAI_AGENT_LLM_MODEL=%s\n" "${OPENAI_AGENT_LLM_MODEL:-gpt-4o-mini}"
  printf "OPENAI_AGENT_TTS_MODEL=%s\n" "${OPENAI_AGENT_TTS_MODEL:-tts-1}"
  printf "OPENAI_AGENT_TTS_VOICE=%s\n" "${OPENAI_AGENT_TTS_VOICE:-alloy}"
  printf "LIVEKIT_AGENT_SESSION_RECORDING_ENABLED=%s\n" "${LIVEKIT_AGENT_SESSION_RECORDING_ENABLED:-true}"
  printf "LIVEKIT_AGENT_RECORD_AUDIO=%s\n" "${LIVEKIT_AGENT_RECORD_AUDIO:-true}"
  printf "LIVEKIT_AGENT_RECORD_LOGS=%s\n" "${LIVEKIT_AGENT_RECORD_LOGS:-true}"
  printf "LIVEKIT_AGENT_RECORD_TRACES=%s\n" "${LIVEKIT_AGENT_RECORD_TRACES:-true}"
  printf "LIVEKIT_AGENT_RECORD_TRANSCRIPT=%s\n" "${LIVEKIT_AGENT_RECORD_TRANSCRIPT:-true}"
  printf "CARTESIA_API_KEY=%s\n" "$CARTESIA_API_KEY"
  printf "OPENAI_API_KEY=%s\n" "$OPENAI_API_KEY"
  printf "LIVEKIT_AGENT_PERSONA_BASE_URL=%s\n" "$LIVEKIT_AGENT_PERSONA_BASE_URL"
  printf "PERSONA_AGENT_READ_SECRET=%s\n" "$PERSONA_AGENT_READ_SECRET"
  printf "WEB_SEARCH_PROVIDER=%s\n" "${WEB_SEARCH_PROVIDER:-parallel}"
  printf "WEB_SEARCH_MAX_RESULTS=%s\n" "${WEB_SEARCH_MAX_RESULTS:-5}"
  printf "WEB_SEARCH_TIMEOUT_SECONDS=%s\n" "${WEB_SEARCH_TIMEOUT_SECONDS:-8}"
  printf "PARALLEL_API_KEY=%s\n" "$PARALLEL_API_KEY"
  printf "EXA_API_KEY=%s\n" "$EXA_API_KEY"
  printf "PERPLEXITY_API_KEY=%s\n" "$PERPLEXITY_API_KEY"
} > "$SECRETS_FILE"

verify_deploy_context() {
  local required_files=(
    Dockerfile
    livekit.toml
    pyproject.toml
    uv.lock
    src/agent.py
    src/agent_web_search.py
    src/web_search.py
    src/web_search_constants.py
    src/web_search_providers.py
  )

  local required_secret_names=(
    LIVEKIT_URL
    LIVEKIT_API_KEY
    LIVEKIT_API_SECRET
    LIVEKIT_AGENT_NAME
    LIVEKIT_AGENT_TTS_VOICE_ID
    OPENAI_AGENT_STT_MODEL
    OPENAI_AGENT_LLM_MODEL
    OPENAI_AGENT_TTS_MODEL
    OPENAI_AGENT_TTS_VOICE
    LIVEKIT_AGENT_SESSION_RECORDING_ENABLED
    LIVEKIT_AGENT_RECORD_AUDIO
    LIVEKIT_AGENT_RECORD_LOGS
    LIVEKIT_AGENT_RECORD_TRACES
    LIVEKIT_AGENT_RECORD_TRANSCRIPT
    CARTESIA_API_KEY
    OPENAI_API_KEY
    LIVEKIT_AGENT_PERSONA_BASE_URL
    PERSONA_AGENT_READ_SECRET
    WEB_SEARCH_PROVIDER
    WEB_SEARCH_MAX_RESULTS
    WEB_SEARCH_TIMEOUT_SECONDS
    PARALLEL_API_KEY
    EXA_API_KEY
    PERPLEXITY_API_KEY
  )

  for path in "${required_files[@]}"; do
    if [[ ! -f "$CONTEXT_DIR/$path" ]]; then
      echo "Deploy context is missing required file: $path" >&2
      return 1
    fi
  done

  for name in "${required_secret_names[@]}"; do
    if ! grep -q "^${name}=" "$SECRETS_FILE"; then
      echo "Deploy secrets file is missing required value: $name" >&2
      return 1
    fi
  done
}

verify_deploy_context

if [[ "$DRY_RUN" == "1" ]]; then
  echo "LiveKit deploy context verified: $CONTEXT_DIR"
  echo "LiveKit deploy secrets verified: $SECRETS_FILE"
  exit 0
fi

echo "Deploying LiveKit Cloud Agent from Python-only context: $CONTEXT_DIR"
lk agent deploy --yes --secrets-file "$SECRETS_FILE" "$CONTEXT_DIR"
