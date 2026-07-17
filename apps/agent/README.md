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
secrets are missing from the local shell. Export `INFISICAL_PROJECT_ID` or run
the agent inside `infisical run` so the project is never embedded in source.

Required Infisical `dev` secrets:

```text
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
```

Optional agent tuning variables:

```text
LIVEKIT_AGENT_NAME
LIVEKIT_AGENT_STT_MODEL
LIVEKIT_AGENT_STT_LANGUAGE
LIVEKIT_AGENT_LLM_MODEL
LIVEKIT_AGENT_TTS_MODEL
WEB_SEARCH_PROVIDER
WEB_SEARCH_MAX_RESULTS
WEB_SEARCH_TIMEOUT_SECONDS
```

Web search providers:

```text
WEB_SEARCH_PROVIDER=parallel
```

Supported values are `parallel`, `exa`, and `perplexity`. Add
`PARALLEL_API_KEY`, `EXA_API_KEY`, and `PERPLEXITY_API_KEY` to Infisical in
both `dev` and `prod` before running the full benchmark. The agent uses only the
selected provider at runtime, but keeping all three keys available lets the
benchmark compare providers without editing secrets.

Run the web search benchmark after the keys are present:

```sh
uv run python src/benchmark_search_providers.py
```

## Production Deployment

The LiveKit Cloud Agent deployment is pinned by `livekit.toml`:

```text
CA_jnUGCWeb8N3c
```

LiveKit recommends deploying agents with the `lk agent deploy` CLI command from
a working directory that contains `livekit.toml` and `Dockerfile`, and passing
runtime secrets with a LiveKit secrets file or `--secrets` flags. This app keeps
`package.json` for monorepo scripts, which makes the LiveKit CLI auto-detect the
directory as a Node agent. Keep `scripts/deploy-livekit-cloud.sh` as a thin repo
wrapper: it creates a Python-only temp context with the committed `Dockerfile`,
`livekit.toml`, `pyproject.toml`, `uv.lock`, and `src` tree, then calls
`lk agent deploy --secrets-file`.

The wrapper bootstraps itself through Infisical and writes the agent, Cartesia,
persona, embedding, and web-search provider secrets into LiveKit Cloud's
encrypted agent secrets. `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and
`LIVEKIT_API_SECRET` are included for local validation, but LiveKit Cloud
generates its own project connection credentials for deployed agents.

Deploy the current agent code to LiveKit Cloud with prod Infisical secrets:

```sh
cd apps/agent
export INFISICAL_PROJECT_ID="<infisical-project-id>"
scripts/deploy-livekit-cloud.sh
```

The deploy script requires `INFISICAL_PROJECT_ID`, defaults to
`INFISICAL_ENV=prod` and `INFISICAL_PATH=/`, and never stores the project ID in
source.

Validate the deployment:

```sh
infisical run \
  --projectId "$INFISICAL_PROJECT_ID" \
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
  --projectId "$INFISICAL_PROJECT_ID" \
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

1. Open `https://www.dennisxing.fm/livekit-agent`.
2. Enter the prod `LIVEKIT_TOKEN_AUTH_SECRET` in Optional endpoint auth.
3. Probe the token endpoint. Expected: success.
4. Start a voice session. Expected: connection state `connected`, agent state
   leaves `failed`, and the LiveKit room contains both the browser participant
   and an `agent-*` participant.
5. In another terminal, list participants for the room shown on the QA page:

```sh
infisical run \
  --projectId "$INFISICAL_PROJECT_ID" \
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
