# Dennis Portfolio Agent

Python LiveKit Agents worker used by the Storybook `LiveCloudSession` test.

Dispatch name:

```text
dennis-portfolio-agent
```

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
