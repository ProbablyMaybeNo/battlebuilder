# Battle Builder

Battle Builder is a desktop-first tactical board planner. Phase 1 provides a
renderer-neutral board document, a precise overhead editor, and an interactive
3D planning view. Game-system rules, units, combat, and simulation are deferred
until the Phase 1 sign-off gate.

## Project status

Foundation batch B00 is complete. The implementation backlog and acceptance
gates live in [`ux-audit/JOB_BATCHES.md`](ux-audit/JOB_BATCHES.md).

The standard new board is 36 by 36 inches, with a fixed one-inch grid. Boards
may be configured up to 72 by 72 inches. Major grid lines occur every 12 inches.

## Local setup

Use Node.js 24 (the baseline is pinned to 24.6.0 in `.node-version`) and pnpm
11.19.0, as recorded in `package.json`.

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

## Checks

| Command | Purpose |
| --- | --- |
| `pnpm lint` | ESLint with zero warnings permitted |
| `pnpm typecheck` | Strict TypeScript project check |
| `pnpm test` | Vitest unit and integration tests |
| `pnpm test:e2e` | Playwright browser tests using isolated storage |
| `pnpm build` | Type-check and make a production Vite build |
| `pnpm audit` | Production dependency vulnerability audit |
| `pnpm bundle:check` | Check initial and lazy chunk budgets after build |

Playwright uses a fresh browser context per test. Tests that touch browser
storage must import `test` from `e2e/fixtures`; it rewrites the user draft key
to the `battle-builder/e2e/v1/` namespace. Never point Playwright at a personal
browser profile.

## Reference material and assets

`Design Cyberpunk 3D Planner/` and `Battle Builder Inspo/` are user-owned local
reference folders only. Their code, assets, imagery, and fonts are excluded from
Git, linting, TypeScript, the bundle, and all shipped artifacts. Battle Builder
uses the visual direction and interaction goals without copying those materials.

## Contribution and handoff

Read [`AGENTS.md`](AGENTS.md) and the active batch before changing code. Work a
single batch at a time, record every finding in `ux-audit/BACKLOG.md`, and do not
start Phase 2 without the B12 evidence gate.

See [`ux-audit/SCREENSHOT_CONVENTION.md`](ux-audit/SCREENSHOT_CONVENTION.md) for
the required stable names for future visual-review evidence.

## License

All rights reserved. This repository does not grant a public license to use,
copy, modify, or distribute the source or product assets.
