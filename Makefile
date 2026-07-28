INFISICAL_ENV ?= dev
INFISICAL_PROJECT_ARG := $(if $(INFISICAL_PROJECT_ID),--projectId $(INFISICAL_PROJECT_ID),)
VOICE_DEV_HOST ?= localhost
VOICE_DEV_PORT ?= 3000
VOICE_DEV_PORT_MAX ?= 3010
VOICE_DEV_PERSONA_BASE_URL_ORIGIN := $(origin VOICE_DEV_PERSONA_BASE_URL)
VOICE_DEV_PERSONA_BASE_URL ?= http://$(VOICE_DEV_HOST):$(VOICE_DEV_PORT)

.DEFAULT_GOAL := help

.PHONY: help hooks-install dev-check lint test build verify verification design-check design-gallery design-gallery-serve web-dev web-dev-local web-dev-check web-lint web-test web-build web-verify agent-dev agent-test agent-check agent-deploy-check agent-verify tokens-build tokens-check design-system-check ci ci-install ci-format ci-lint ci-typecheck ci-test ci-build voice-dev voice-dev-check persona-e2e persona-e2e-infisical persona-e2e-clone pr-ready livekit-agent-e2e

help: ## Show available workflow commands.
	@awk 'BEGIN {FS = ":.*## "; printf "Usage: make <target>\n\nTargets:\n"} /^[a-zA-Z0-9_-]+:.*## / {printf "  %-26s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

hooks-install: ## Configure this checkout to use repository-owned Git hooks.
	git config core.hooksPath .githooks
	@echo "Installed repository hooks from .githooks"

dev-check: ci-format ci-lint ci-typecheck ## Run fast deterministic source checks for local development.

lint: ci-lint ## Run all lint and structural checks.

test: ci-test ## Run the default test suite.

build: ci-build ## Build packages and the web app.

verify: dev-check ci-test ci-build agent-check ## Run complete checks for normal PR confidence.

verification: verify design-check agent-deploy-check ## Run exhaustive release-confidence checks.

design-check: tokens-build ## Validate tokens, design rules, Storybook build, and token drift.
	corepack pnpm lint:classnames
	corepack pnpm lint:classnames:test
	corepack pnpm lint:design-system
	corepack pnpm lint:styles
	corepack pnpm lint:ast
	corepack pnpm build-storybook
	git diff --exit-code packages/tokens/dist

design-gallery: ## Build the static Storybook design gallery.
	corepack pnpm build-storybook

design-gallery-serve: ## Serve the local Storybook design gallery at http://localhost:6006.
	corepack pnpm storybook

web-dev: ## Run the web app with Infisical-managed development secrets.
	corepack pnpm --filter @starter/web dev

web-dev-local: ## Run the web app without Infisical for local-only development.
	corepack pnpm --filter @starter/web dev:local

web-dev-check: web-lint ci-typecheck ## Run fast web-only source checks.

web-lint: ## Run web ESLint.
	corepack pnpm --filter @starter/web lint

web-test: ## Run web tests.
	corepack pnpm --filter @starter/web test

web-build: ## Build the web app.
	corepack pnpm --filter @starter/web build

web-verify: web-dev-check web-test web-build ## Run complete web checks.

agent-dev: ## Run the LiveKit agent with Infisical-managed development secrets.
	corepack pnpm --filter @starter/agent dev

agent-test: ## Run Python agent tests.
	corepack pnpm --filter @starter/agent test

agent-check: agent-test ## Run Python agent tests and compile checks.
	corepack pnpm --filter @starter/agent run check

agent-verify: agent-check agent-deploy-check ## Run complete agent checks.

tokens-build: ## Regenerate design token outputs.
	corepack pnpm --filter @starter/tokens build

tokens-check: ## Build and typecheck design token package.
	corepack pnpm --filter @starter/tokens check

design-system-check: ## Typecheck the shared design-system package.
	corepack pnpm --filter @starter/design-system check

voice-dev:
	@INFISICAL_ENV="$(INFISICAL_ENV)" \
		INFISICAL_PROJECT_ID="$(INFISICAL_PROJECT_ID)" \
		VOICE_DEV_HOST="$(VOICE_DEV_HOST)" \
		VOICE_DEV_PORT="$(VOICE_DEV_PORT)" \
		VOICE_DEV_PORT_MAX="$(VOICE_DEV_PORT_MAX)" \
		VOICE_DEV_PERSONA_BASE_URL="$(VOICE_DEV_PERSONA_BASE_URL)" \
		VOICE_DEV_PERSONA_BASE_URL_ORIGIN="$(VOICE_DEV_PERSONA_BASE_URL_ORIGIN)" \
		scripts/voice-dev.sh

voice-dev-check:
	scripts/test-voice-dev.sh

ci: ci-install ci-format ci-lint ci-typecheck ci-test ci-build ## Install dependencies and run default CI checks.

ci-install: ## Install workspace dependencies from the lockfile.
	corepack pnpm install --frozen-lockfile

ci-format: ## Check code formatting.
	corepack pnpm format:check

ci-lint: tokens-build ## Run ESLint, stylelint, and project structural lint rules.
	corepack pnpm lint:classnames
	corepack pnpm lint:classnames:test
	corepack pnpm lint
	corepack pnpm lint:styles
	corepack pnpm lint:ast
	corepack pnpm lint:design-system
	corepack pnpm lint:workflow
	git diff --exit-code packages/tokens/dist

ci-typecheck: ## Run TypeScript typechecking across the workspace.
	corepack pnpm typecheck

ci-test: ## Run the default test suite.
	corepack pnpm test

ci-build: ## Build packages and the web app.
	corepack pnpm build

persona-e2e:
	PERSONA_E2E=1 corepack pnpm --filter @starter/web test -- src/server/personas.e2e.test.ts

persona-e2e-infisical:
	infisical run $(INFISICAL_PROJECT_ARG) --env=$(INFISICAL_ENV) -- sh -c 'PERSONA_E2E_BASE_URL="$${PERSONA_E2E_BASE_URL:-$(VOICE_DEV_PERSONA_BASE_URL)}" make persona-e2e'

persona-e2e-clone:
	infisical run $(INFISICAL_PROJECT_ARG) --env=$(INFISICAL_ENV) -- sh -c 'PERSONA_AGENT_READ_SECRET="$${PERSONA_AGENT_READ_SECRET:-dev-persona-secret}" PERSONA_E2E_BASE_URL="$${PERSONA_E2E_BASE_URL:-$(VOICE_DEV_PERSONA_BASE_URL)}" corepack pnpm exec concurrently -k -s first -n web,test "PORT=$(VOICE_DEV_PORT) corepack pnpm --filter @starter/web dev" "corepack pnpm exec wait-on $(VOICE_DEV_PERSONA_BASE_URL)/api/personas && PERSONA_E2E=1 corepack pnpm --filter @starter/web test -- src/server/personas.e2e.test.ts"'

agent-deploy-check: ## Dry-run the LiveKit agent deployment wrapper with dummy secrets.
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

pr-ready: verify agent-deploy-check ## Run the checks expected before opening a PR.

livekit-agent-e2e:
	corepack pnpm exec concurrently -k -s first -n agent,web \
		"corepack pnpm --filter @starter/agent dev" \
		"infisical run $(INFISICAL_PROJECT_ARG) --env=dev -- corepack pnpm --filter @starter/web dev"
