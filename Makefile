.PHONY: ci ci-install ci-format ci-lint ci-typecheck ci-test ci-build voice-dev agent-check agent-deploy-check pr-ready livekit-agent-e2e

voice-dev:
	corepack pnpm exec concurrently -k -s first -n web,agent -c cyan,magenta "corepack pnpm dev" "corepack pnpm --filter @starter/agent dev"

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

agent-check:
	corepack pnpm --filter @starter/agent test
	corepack pnpm --filter @starter/agent run check

agent-deploy-check:
	cd apps/agent && \
		LIVEKIT_AGENT_DEPLOY_DRY_RUN=1 \
		LIVEKIT_URL=wss://example.invalid \
		LIVEKIT_API_KEY=dummy-livekit-api-key \
		LIVEKIT_API_SECRET=dummy-livekit-api-secret \
		LIVEKIT_AGENT_TTS_VOICE_ID=dummy-voice-id \
		WEB_SEARCH_PROVIDER=parallel \
		WEB_SEARCH_MAX_RESULTS=5 \
		WEB_SEARCH_TIMEOUT_SECONDS=8 \
		PARALLEL_API_KEY=dummy-parallel-api-key \
		EXA_API_KEY=dummy-exa-api-key \
		PERPLEXITY_API_KEY=dummy-perplexity-api-key \
		scripts/deploy-livekit-cloud.sh

pr-ready: ci agent-check agent-deploy-check

livekit-agent-e2e:
	corepack pnpm exec concurrently -k -s first -n agent,web \
		"corepack pnpm --filter @starter/agent dev" \
		"infisical run --projectId 87922978-15ad-4880-add7-5ae10dbff217 --env=dev -- corepack pnpm --filter @starter/web dev"
