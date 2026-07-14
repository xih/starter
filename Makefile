.PHONY: ci ci-install ci-format ci-lint ci-typecheck ci-test ci-build livekit-agent-e2e

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

livekit-agent-e2e:
	corepack pnpm exec concurrently -k -s first -n agent,web \
		"corepack pnpm --filter @starter/agent dev" \
		"infisical run --projectId 87922978-15ad-4880-add7-5ae10dbff217 --env=dev -- corepack pnpm --filter @starter/web dev"
