# Frontend Token Linting Research

## Sources

- Storybook visual tests: https://storybook.js.org/docs/writing-tests/visual-testing
- Chromatic GitHub Actions: https://www.chromatic.com/docs/github-actions/
- Chromatic TurboSnap: https://www.chromatic.com/docs/turbosnap/
- Chromatic TurboSnap troubleshooting: https://www.chromatic.com/docs/turbosnap/troubleshooting/

## Findings

Storybook treats each story as a visual test surface, and its current docs recommend using the official Chromatic integration locally during development and in CI before merge. That gives component-level pixel comparisons in a real browser, which catches visual regressions that static linters cannot see.

Chromatic's GitHub Actions setup recommends checking out full git history with `fetch-depth: 0`. That matters for changed-file analysis because TurboSnap uses git ancestry to decide which stories need new snapshots.

TurboSnap is the current Chromatic path for changed-story visual testing in large projects. It is enabled with `onlyChanged: true`, and token or design-system packages should be listed as `externals` when changes may affect Storybook output outside the normal dependency graph.

Chromatic's troubleshooting docs call out common missed-change causes: shallow git history, missing stats data, package/lockfile changes, Storybook config changes, and barrel files that confuse dependency tracing. The practical edge is to pair Chromatic with a static changed-file lint gate: Chromatic proves rendered output, while the static gate prevents hardcoded technical values from entering the design-system surface in the first place.

## Repo Approach

This repo now uses `corepack pnpm lint:frontend-tokens` as a changed-file guard for frontend files. It scans `apps/web/src`, `apps/web/.storybook`, and `packages/design-system/src` for raw colors, arbitrary Tailwind values, raw Tailwind palette classes, raw spacing utilities, raw radius utilities, and inline style values that should come from tokens.

The rollout is intentionally changed-file based because the existing frontend contains legacy hardcoded values. For cleanup work, `corepack pnpm lint:frontend-tokens:all` runs the same policy across the whole frontend.

CI runs the static token linter in the lint job and runs Storybook plus Chromatic in a dedicated visual test job. Chromatic uses `onlyChanged: true`, marks token and design-system packages as externals, and fails on unaccepted visual changes with `exitZeroOnChanges: false`.
