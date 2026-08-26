# Battle Builder backlog

## Working agreement

Every discovered defect, missing capability, performance issue, usability improvement, or visual issue is logged here, resolved in the active batch, and moved to the completed section with verification evidence. Phase 2 work is recorded separately only after Phase 1 sign-off.

## Active

_No active defects recorded._

## Completed

- **B00-001 — Invalid icon dependency prevented reproducible installation.**
  Replaced the nonexistent `@lucide/react` package with `lucide-react`, then
  generated and verified `pnpm-lock.yaml` with `pnpm install`.
- **B00-002 — Tooling was incomplete and production audit was unsafe.** Added
  the missing `@eslint/js` dependency, upgraded Vitest from 2.x to 3.2.7 to
  remove the reported critical dependency advisory, and configured esbuild's
  project-scoped pnpm build approval. Verified with `pnpm lint`, `pnpm
  typecheck`, `pnpm test`, `pnpm build`, `pnpm audit`, and `pnpm bundle:check`.
- **B00-003 — Browser tests could target a user's normal local draft.** Added
  an isolated Playwright fixture that rewrites the draft namespace to
  `battle-builder/e2e/v1/`, with a passing Chromium verification spec.
- **B01-001 — Baseline board data could accept configurable grids, board sizes
  beyond 72 inches, and unvalidated nested terrain data.** Replaced it with a
  renderer-neutral v1 contract, strict runtime parser, explicit no-op migration
  registry, fixed one-inch grid rule, 12–72 inch limits, structure footprints,
  exterior door/window checks, and focused unit coverage.
- **B01-002 — Draft and saved-board storage had no recovery or isolation-safe
  library contract.** Added debounced draft persistence with explicit state,
  non-destructive corrupt-draft fallback, and a separate namespaced saved-board
  index supporting create/open/duplicate/rename. Verified with unit and
  isolated-browser tests.
- **B02-001 — The bootstrap view did not provide a board-dominant workspace or
  accessible panel framework.** Replaced it with scoped Cyberpunk-derived
  workspace tokens, document bar, on-demand activity drawers, control shelf,
  zero state, selection-only inspector container, reusable controls, and
  reduced-motion behavior. Verified at both desktop target sizes.
- **B02-002 — Initial shell accessibility review found tooltip contrast and
  nested Escape/focus-restoration defects.** Tooltips now avoid transitional
  low-contrast states, while capture-phase dialog handling preserves the drawer
  opener's focus. Verified with passing axe, keyboard, and focus E2E coverage.
