# Dennis Portfolio Agent

Python LiveKit Agents worker used by the Storybook `LiveCloudSession` test.

Dispatch name:

```text
dennis-portfolio-agent
```

This dispatch name is the contract between the web token route and the LiveKit
worker. The web app asks LiveKit to dispatch `dennis-portfolio-agent`; the
deployed worker must register the same value through `WorkerOptions.agent_name`.

Local development:

```sh
uv sync --locked
uv run python src/agent.py doctor
corepack pnpm --filter @starter/agent dev
```

The script will automatically re-run itself through Infisical when required
secrets are missing from the local shell. The default project is:

```text
87922978-15ad-4880-add7-5ae10dbff217
```

Required Infisical `dev` secrets:

```text
LIVEKIT_URL
LIVEKIT_API_KEY
LIVEKIT_API_SECRET
LIVEKIT_AGENT_TTS_VOICE_ID
OPENAI_API_KEY
```

Optional agent tuning variables:

```text
LIVEKIT_AGENT_NAME
LIVEKIT_AGENT_STT_MODEL
LIVEKIT_AGENT_STT_LANGUAGE
LIVEKIT_AGENT_LLM_MODEL
LIVEKIT_AGENT_TTS_MODEL
```

## Production Deployment

The LiveKit Cloud Agent deployment is pinned by `livekit.toml`:

```text
CA_jnUGCWeb8N3c
```

The app intentionally keeps `package.json` for monorepo scripts. The LiveKit
CLI auto-detects that file as a Node agent, so do not deploy directly from this
directory. Use `scripts/deploy-livekit-cloud.sh`; it creates a Python-only temp
context with the committed `Dockerfile`, `livekit.toml`, `pyproject.toml`,
`uv.lock`, and `src/agent.py`.

Deploy the current agent code to LiveKit Cloud with prod Infisical secrets:

```sh
infisical run \
  --projectId 87922978-15ad-4880-add7-5ae10dbff217 \
  --env=prod \
  --path=/ \
  -- bash -lc '
    cd apps/agent
    scripts/deploy-livekit-cloud.sh
  '
```

Validate the deployment:

```sh
infisical run \
  --projectId 87922978-15ad-4880-add7-5ae10dbff217 \
  --env=prod \
  --path=/ \
  -- bash -lc '
    cd apps/agent
    lk agent list
    lk agent status
    lk agent secrets
  '
```

Expected checks:

- `lk agent status` shows the latest deployment version.
- `lk agent secrets` includes the production `LIVEKIT_AGENT_*` names used by
  the worker.
- A smoke dispatch for `dennis-portfolio-agent` creates an `agent-*`
  participant in the room.

Smoke test the dispatch name:

```sh
infisical run \
  --projectId 87922978-15ad-4880-add7-5ae10dbff217 \
  --env=prod \
  --path=/ \
  -- bash -lc '
    room="agent_smoke_$(date +%s)"
    lk dispatch create --room "$room" --agent-name dennis-portfolio-agent
    sleep 8
    lk dispatch list "$room"
    lk room participants list "$room"
    lk room delete "$room"
  '
```

Expected smoke-test output:

- `lk dispatch list` shows `AgentName` as `dennis-portfolio-agent`.
- `lk room participants list` shows an active participant like
  `agent-AJ_...`.
- `lk agent status` shows the latest deployment version and healthy/sleeping
  replicas.
- `lk room delete` removes the smoke room.

End-to-end validation:

1. Open `https://starter-three-sepia.vercel.app/livekit-agent`.
2. Enter the prod `LIVEKIT_TOKEN_AUTH_SECRET` in Optional endpoint auth.
3. Probe the token endpoint. Expected: success.
4. Start a voice session. Expected: connection state `connected`, agent state
   leaves `failed`, and the LiveKit room contains both the browser participant
   and an `agent-*` participant.
5. In another terminal, list participants for the room shown on the QA page:

```sh
infisical run \
  --projectId 87922978-15ad-4880-add7-5ae10dbff217 \
  --env=prod \
  --path=/ \
  -- bash -lc 'lk room participants list "<room-name-from-qa-page>"'
```

Validation:

```sh
corepack pnpm --filter @starter/agent run doctor
corepack pnpm --filter @starter/agent run check
```

Local development:

```sh
corepack pnpm --filter @starter/agent dev
```

No-hot-reload Python fallback:

```sh
uv run python src/agent.py dev --no-reload
```

`lk agent dev src/agent.py` currently misdetects this workspace as a Node agent
because this folder has a `package.json` for monorepo scripts. Use the default
`dev` script above for local Python testing.
