#!/bin/sh
set -eu

repo_root="$(cd "$(dirname "$0")/.." && pwd)"

run_case() {
  name="$1"
  shift

  tmpdir="$(mktemp -d)"
  bindir="$tmpdir/bin"
  mkdir -p "$bindir"

  cat > "$bindir/infisical" <<'STUB'
#!/bin/sh
echo "INFISICAL_ARGS=$*"
echo "VOICE_DEV_SELECTED_BASE_URL=$VOICE_DEV_SELECTED_BASE_URL"
echo "WEB_CMD=$WEB_CMD"
echo "AGENT_CMD=$AGENT_CMD"
STUB
  chmod +x "$bindir/infisical"

  cat > "$bindir/lsof" <<'STUB'
#!/bin/sh
case "$*" in
  *"-iTCP:3000"*) exit 0 ;;
  *) exit 1 ;;
esac
STUB
  chmod +x "$bindir/lsof"

  if ! output="$(PATH="$bindir:$PATH" TMPDIR="$tmpdir" "$@" 2>&1)"; then
    echo "FAIL: $name" >&2
    echo "$output" >&2
    rm -rf "$tmpdir"
    exit 1
  fi

  printf '%s\n' "$output"
  rm -rf "$tmpdir"
}

expect_contains() {
  name="$1"
  output="$2"
  expected="$3"

  case "$output" in
    *"$expected"*) ;;
    *)
      echo "FAIL: $name" >&2
      echo "Expected output to contain: $expected" >&2
      echo "$output" >&2
      exit 1
      ;;
  esac
}

default_output="$(run_case "default fallback" "$repo_root/scripts/voice-dev.sh")"
expect_contains "default fallback" "$default_output" "Port 3000 is already in use; trying 3001."
expect_contains "default fallback" "$default_output" "Starting voice-dev on http://localhost:3001"
expect_contains "default fallback" "$default_output" "VOICE_DEV_SELECTED_BASE_URL=http://localhost:3001"
expect_contains "default fallback" "$default_output" "WEB_CMD=PORT=3001 corepack pnpm --filter @starter/web dev"

persona_output="$(run_case "persona override" env VOICE_DEV_PERSONA_BASE_URL=https://persona.example.test VOICE_DEV_PERSONA_BASE_URL_ORIGIN=command "$repo_root/scripts/voice-dev.sh")"
expect_contains "persona override" "$persona_output" "VOICE_DEV_SELECTED_BASE_URL=https://persona.example.test"
expect_contains "persona override" "$persona_output" "WEB_CMD=PORT=3001 corepack pnpm --filter @starter/web dev"

livekit_output="$(run_case "livekit override" env LIVEKIT_AGENT_PERSONA_BASE_URL=https://livekit.example.test VOICE_DEV_PERSONA_BASE_URL=https://persona.example.test VOICE_DEV_PERSONA_BASE_URL_ORIGIN=command "$repo_root/scripts/voice-dev.sh")"
expect_contains "livekit override" "$livekit_output" "VOICE_DEV_SELECTED_BASE_URL=https://livekit.example.test"

tmpdir="$(mktemp -d)"
bindir="$tmpdir/bin"
mkdir -p "$bindir" "$tmpdir/starter-voice-dev-ports/3001.lock"
printf '%s\n' "$$" > "$tmpdir/starter-voice-dev-ports/3001.lock/pid"

cat > "$bindir/infisical" <<'STUB'
#!/bin/sh
echo "VOICE_DEV_SELECTED_BASE_URL=$VOICE_DEV_SELECTED_BASE_URL"
echo "WEB_CMD=$WEB_CMD"
STUB
chmod +x "$bindir/infisical"

cat > "$bindir/lsof" <<'STUB'
#!/bin/sh
exit 1
STUB
chmod +x "$bindir/lsof"

reserved_output="$(PATH="$bindir:$PATH" TMPDIR="$tmpdir" VOICE_DEV_PORT=3001 "$repo_root/scripts/voice-dev.sh")"
expect_contains "reserved fallback" "$reserved_output" "Port 3001 is reserved by another voice-dev startup; trying 3002."
expect_contains "reserved fallback" "$reserved_output" "VOICE_DEV_SELECTED_BASE_URL=http://localhost:3002"
rm -rf "$tmpdir"

tmpdir="$(mktemp -d)"
bindir="$tmpdir/bin"
mkdir -p "$bindir"

cat > "$bindir/lsof" <<'STUB'
#!/bin/sh
exit 0
STUB
chmod +x "$bindir/lsof"

if PATH="$bindir:$PATH" TMPDIR="$tmpdir" VOICE_DEV_PORT=3000 VOICE_DEV_PORT_MAX=3000 "$repo_root/scripts/voice-dev.sh" >/tmp/voice-dev-test-output.$$ 2>&1; then
  echo "FAIL: exhausted range" >&2
  cat /tmp/voice-dev-test-output.$$ >&2
  rm -f /tmp/voice-dev-test-output.$$
  rm -rf "$tmpdir"
  exit 1
fi
exhausted_output="$(cat /tmp/voice-dev-test-output.$$)"
rm -f /tmp/voice-dev-test-output.$$
rm -rf "$tmpdir"
expect_contains "exhausted range" "$exhausted_output" "No available voice-dev port found from 3000 through 3000."

echo "voice-dev script tests passed"
