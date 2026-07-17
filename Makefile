INFISICAL_ENV ?= dev
VOICE_DEV_PORT ?= 3000
VOICE_DEV_PERSONA_BASE_URL ?= http://localhost:$(VOICE_DEV_PORT)

.PHONY: ci ci-install ci-format ci-lint ci-typecheck ci-test ci-build voice-dev persona-e2e persona-e2e-infisical persona-e2e-clone agent-check agent-deploy-check pr-ready livekit-agent-e2e require-infisical-project

require-infisical-project:
	@if [ -z "$(INFISICAL_PROJECT_ID)" ]; then \
		echo "Missing INFISICAL_PROJECT_ID. Export it before running Infisical-backed targets."; \
		exit 1; \
	fi

voice-dev: require-infisical-project
	@if lsof -nP -iTCP:$(VOICE_DEV_PORT) -sTCP:LISTEN >/dev/null 2>&1; then \
		echo "Port $(VOICE_DEV_PORT) is already in use. Stop that server or run VOICE_DEV_PORT=3001 make voice-dev."; \
		lsof -nP -iTCP:$(VOICE_DEV_PORT) -sTCP:LISTEN; \
		exit 1; \
	fi
	infisical run --projectId $(INFISICAL_PROJECT_ID) --env=$(INFISICAL_ENV) -- sh -c 'PERSONA_AGENT_READ_SECRET="$${PERSONA_AGENT_READ_SECRET:-dev-persona-secret}" LIVEKIT_AGENT_PERSONA_BASE_URL="$${LIVEKIT_AGENT_PERSONA_BASE_URL:-$(VOICE_DEV_PERSONA_BASE_URL)}" corepack pnpm exec concurrently -k -n web,agent -c cyan,magenta "PORT=$(VOICE_DEV_PORT) corepack pnpm --filter @starter/web dev" "corepack pnpm --filter @starter/agent dev:python"'

ci: ci-install ci-format ci-lint ci-typecheck ci-test ci-build

ci-install:
	corepack pnpm install --frozen-lockfile

ci-format:
	corepack pnpm format:check

ci-lint:
	corepack pnpm lint
	corepack pnpm lint:styles
	corepack pnpm lint:ast
	corepack pnpm lint:design-system

ci-typecheck:
	corepack pnpm typecheck

ci-test:
	corepack pnpm test

ci-build:
	corepack pnpm build

persona-e2e:
	PERSONA_E2E=1 corepack pnpm --filter @starter/web test -- src/server/personas.e2e.test.ts

persona-e2e-infisical: require-infisical-project
	infisical run --projectId $(INFISICAL_PROJECT_ID) --env=$(INFISICAL_ENV) -- sh -c 'PERSONA_E2E_BASE_URL="$${PERSONA_E2E_BASE_URL:-$(VOICE_DEV_PERSONA_BASE_URL)}" make persona-e2e'

persona-e2e-clone: require-infisical-project
	infisical run --projectId $(INFISICAL_PROJECT_ID) --env=$(INFISICAL_ENV) -- sh -c 'PERSONA_AGENT_READ_SECRET="$${PERSONA_AGENT_READ_SECRET:-dev-persona-secret}" PERSONA_E2E_BASE_URL="$${PERSONA_E2E_BASE_URL:-$(VOICE_DEV_PERSONA_BASE_URL)}" corepack pnpm exec concurrently -k -s first -n web,test "PORT=$(VOICE_DEV_PORT) corepack pnpm --filter @starter/web dev" "corepack pnpm exec wait-on $(VOICE_DEV_PERSONA_BASE_URL)/api/personas && PERSONA_E2E=1 corepack pnpm --filter @starter/web test -- src/server/personas.e2e.test.ts"'

agent-check:
	corepack pnpm --filter @starter/agent test
	corepack pnpm --filter @starter/agent run check

agent-deploy-check:
	cd apps/agent && \
		LIVEKIT_AGENT_DEPLOY_DRY_RUN=1 \
		LIVEKIT_AGENT_DEPLOY_SKIP_INFISICAL=1 \
		LIVEKIT_URL=wss://example.invalid \
		LIVEKIT_API_KEY=dummy-livekit-api-key \
		LIVEKIT_API_SECRET=dummy-livekit-api-secret \
		LIVEKIT_AGENT_TTS_VOICE_ID=dummy-voice-id \
		CARTESIA_API_KEY=dummy-cartesia-api-key \
		OPENAI_API_KEY=dummy-openai-api-key \
		LIVEKIT_AGENT_PERSONA_BASE_URL=https://example.invalid \
		PERSONA_AGENT_READ_SECRET=dummy-persona-read-secret \
		WEB_SEARCH_PROVIDER=parallel \
		WEB_SEARCH_MAX_RESULTS=5 \
		WEB_SEARCH_TIMEOUT_SECONDS=8 \
		PARALLEL_API_KEY=dummy-parallel-api-key \
		EXA_API_KEY=dummy-exa-api-key \
		PERPLEXITY_API_KEY=dummy-perplexity-api-key \
		scripts/deploy-livekit-cloud.sh

pr-ready: ci agent-check agent-deploy-check

livekit-agent-e2e: require-infisical-project
	corepack pnpm exec concurrently -k -s first -n agent,web \
		"corepack pnpm --filter @starter/agent dev" \
		"infisical run --projectId $(INFISICAL_PROJECT_ID) --env=dev -- corepack pnpm --filter @starter/web dev"
