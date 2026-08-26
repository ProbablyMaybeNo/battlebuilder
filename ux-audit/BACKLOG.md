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
