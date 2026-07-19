#!/bin/sh
set -eu

port="${VOICE_DEV_PORT:-3000}"
max_port="${VOICE_DEV_PORT_MAX:-3010}"
host="${VOICE_DEV_HOST:-localhost}"
lock_root="${TMPDIR:-/tmp}/starter-voice-dev-ports"

mkdir -p "$lock_root"

while :; do
  lock_dir="$lock_root/$port.lock"

  if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Port $port is already in use; trying $((port + 1))."
  elif mkdir "$lock_dir" 2>/dev/null; then
    printf '%s\n' "$$" > "$lock_dir/pid"
    break
  else
    lock_pid="$(cat "$lock_dir/pid" 2>/dev/null || true)"
    if [ -n "$lock_pid" ] && ! kill -0 "$lock_pid" 2>/dev/null; then
      rm -rf "$lock_dir"
      continue
    fi
    echo "Port $port is reserved by another voice-dev startup; trying $((port + 1))."
  fi

  port=$((port + 1))
  if [ "$port" -gt "$max_port" ]; then
    echo "No available voice-dev port found from ${VOICE_DEV_PORT:-3000} through $max_port." >&2
    exit 1
  fi
done

cleanup() {
  rm -rf "$lock_dir"
}
trap cleanup EXIT INT TERM

base_url="http://$host:$port"
persona_base_url="$base_url"

if [ -n "${LIVEKIT_AGENT_PERSONA_BASE_URL:-}" ]; then
  persona_base_url="$LIVEKIT_AGENT_PERSONA_BASE_URL"
elif [ "${VOICE_DEV_PERSONA_BASE_URL_ORIGIN:-undefined}" != "undefined" ]; then
  persona_base_url="${VOICE_DEV_PERSONA_BASE_URL:-$base_url}"
fi

echo "Starting voice-dev on $base_url"

if [ ! -x node_modules/.bin/concurrently ]; then
  echo "Installing workspace dependencies for voice-dev..."
  corepack pnpm install --frozen-lockfile
fi

web_cmd="PORT=$port corepack pnpm --filter @starter/web dev"
agent_cmd="corepack pnpm --filter @starter/agent dev:python"
infisical_env="${INFISICAL_ENV:-dev}"

if [ -n "${INFISICAL_PROJECT_ID:-}" ]; then
  VOICE_DEV_SELECTED_BASE_URL="$persona_base_url" WEB_CMD="$web_cmd" AGENT_CMD="$agent_cmd" \
    infisical run --projectId "$INFISICAL_PROJECT_ID" --env="$infisical_env" -- sh -c \
    'PERSONA_AGENT_READ_SECRET="${PERSONA_AGENT_READ_SECRET:-dev-persona-secret}" LIVEKIT_AGENT_PERSONA_BASE_URL="${VOICE_DEV_SELECTED_BASE_URL}" corepack pnpm exec concurrently -k -n web,agent -c cyan,magenta "$WEB_CMD" "$AGENT_CMD"'
else
  VOICE_DEV_SELECTED_BASE_URL="$persona_base_url" WEB_CMD="$web_cmd" AGENT_CMD="$agent_cmd" \
    infisical run --env="$infisical_env" -- sh -c \
    'PERSONA_AGENT_READ_SECRET="${PERSONA_AGENT_READ_SECRET:-dev-persona-secret}" LIVEKIT_AGENT_PERSONA_BASE_URL="${VOICE_DEV_SELECTED_BASE_URL}" corepack pnpm exec concurrently -k -n web,agent -c cyan,magenta "$WEB_CMD" "$AGENT_CMD"'
fi
