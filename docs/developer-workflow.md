# Developer Workflow

This repository uses native tools behind a root `Makefile` command surface. The
goal is that humans and coding agents can remember one vocabulary, while pnpm,
Next.js, Storybook, Vitest, TypeScript, uv, and LiveKit still own their native
jobs.

Run `make help` to see the current command menu.

## Command Lanes

| Lane                    | Command                                | Use When                                                                                                     |
| ----------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Fast local check        | `make dev-check`                       | Before committing or after a focused source change. Runs formatting, lint, structural checks, and typecheck. |
| Surface verification    | `make web-verify`, `make agent-verify` | When a change primarily touches one deployable surface.                                                      |
| PR confidence           | `make verify`                          | Before opening or updating a pull request. Runs fast checks, tests, builds, and agent checks.                |
| Exhaustive verification | `make verification`                    | Before release, risky changes, or main-branch confidence checks. Includes deployment dry-run checks.         |
| Design system           | `make design-check`                    | After token, Tailwind, shared component, Storybook, or visual-system changes.                                |
| Design gallery          | `make design-gallery-serve`            | While developing or reviewing components and tokens in Storybook.                                            |

## Surface Commands

| Surface              | Commands                                                                                                                          |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Web app              | `make web-dev`, `make web-dev-local`, `make web-dev-check`, `make web-lint`, `make web-test`, `make web-build`, `make web-verify` |
| LiveKit agent        | `make agent-dev`, `make agent-test`, `make agent-check`, `make agent-deploy-check`, `make agent-verify`                           |
| Design tokens        | `make tokens-build`, `make tokens-check`                                                                                          |
| Shared design system | `make design-system-check`, `make design-check`, `make design-gallery`, `make design-gallery-serve`                               |

The `scrapers/` and `packages/server/` Python folders are experimental utilities,
not release-critical surfaces. They keep their local README/Pipfile workflows
until they become part of the main product contract.

## Hooks

Install hooks once per checkout:

```sh
make hooks-install
```

The installer sets `git config core.hooksPath .githooks`, which is relative to
this worktree. Hooks do not write files.

- `pre-commit` blocks commits on `main`/`master` and runs `make dev-check`.
- `pre-push` blocks direct pushes to `main`/`master`.
- Set `RUN_PRE_PUSH_VERIFY=1` when pushing to opt into `make verify`.

## CI

GitHub Actions call the same Make targets used locally:

- `.github/workflows/ci.yml` runs format, lint, typecheck, test, and build lanes.
- `.github/workflows/design-system-ci.yml` runs `make design-check`, Storybook
  tests, and Chromatic when `CHROMATIC_PROJECT_TOKEN` is available.

Both workflows use least-privilege read permissions and cancel obsolete runs.

## Design Tokens

Authoritative token sources live in:

- `packages/tokens/src/Light.tokens.json`
- `packages/tokens/src/Dark.tokens.json`

Generated token outputs live under `packages/tokens/dist/` and are checked for
drift in `make design-check`.

After changing token JSON, run:

```sh
make tokens-build
make design-check
```

Application code should prefer semantic token classes and CSS variables. The
design checker treats mature token-generation invariants as errors and reports
legacy raw values as advisory warnings. A legitimate exception can include an
inline reason:

```ts
// design-ok: required by third-party widget contract
```

## Storybook

Storybook is the visual design gallery. It imports the runtime token CSS and
shared design-system styles from `apps/web/.storybook/preview.tsx`.

Use:

```sh
make design-gallery-serve
```

Add token or component examples as colocated `*.stories.tsx` files under
`apps/web/src/` or the existing `apps/web/src/stories/` gallery.

## Generated Files

These files are generated and should not be edited by hand:

- `packages/tokens/dist/**`
- `apps/web/storybook-static/**`
- `apps/web/public/storybook/**`

The token `dist` files are committed because package consumers import them.
Storybook build output is ignored except when copied into the deployed web app
by the existing Vercel build path.

## Required Tools

- Node.js: `.nvmrc` currently pins `22.12.0`.
- Package manager: `pnpm@10.10.0` through Corepack.
- Python agent tooling: `uv` for `apps/agent`.
- Secrets: Infisical is required for normal secret-backed web and agent dev
  commands. Use `make web-dev-local` and agent doctor/local commands when
  intentionally avoiding Infisical.
