.PHONY: ci ci-install ci-format ci-lint ci-typecheck ci-test ci-build

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
