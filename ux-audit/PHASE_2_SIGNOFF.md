# Phase 2 sign-off — generic simulation platform

**Decision:** Pass — 2026-08-28

Phase 2 is complete for the original `battle-builder-generic@1` reference
adapter. This decision does not certify compatibility with any third-party
game system. Future rules systems must be implemented as versioned adapters.

## Acceptance evidence

| Requirement | Result | Evidence |
| --- | --- | --- |
| Build-to-Battle and safe Build return | Pass | Isolated browser flows and `b17-deployment`, `b17-return-build` at both desktop sizes. |
| Deployment, turns, actions, invalid recovery | Pass | Keyboard evidence flow; `b17-active-turn`, `b17-target-los-cover`, and `b17-invalid-action`. |
| Seeded roll, log, and replay | Pass | `b17-roll-explanation`, `b17-log-replay`; reducer replay tests reproduce serialized command history exactly. |
| Accessibility and reduced motion | Pass | Focused axe scans have no serious/critical findings; keyboard and reduced-motion browser coverage pass. |
| Renderer compatibility | Pass | Battle units/selectors remain synchronized across overhead/3D; Phase 1 regression suite passes. |
| Performance and bundle budget | Pass | Battle profiles: 36×36 360 ms overhead / 469 ms 3D; 72×72 570 ms / 498 ms. Entry is 329.9 KiB / 350 KiB; lazy 3D 516.4 KiB / 700 KiB. |

## Verification record

- `pnpm lint` and `pnpm typecheck` passed.
- `pnpm test` passed: 47 tests, including deterministic seed/command replay,
  board/session separation, validation, movement, range, LOS, cover, and
  objective edge cases.
- `pnpm test:e2e` passed: 48 isolated Chromium tests, including B17 evidence,
  accessibility/axe, invalid recovery, replay, reduced motion, and planner
  regressions.
- `pnpm build`, `pnpm bundle:check`, `pnpm audit`, and
  `pnpm release:hygiene` passed.

## Adapter extension guidance

Do not add game-specific fields to `BoardDocument`, renderer components, or
planner persistence. Implement the complete `RulesAdapter` contract in
`src/simulation/rules.ts`, register a stable adapter ID/version, use only the
immutable `BattleSession` snapshot and serializable PRNG state, return a full
`RuleExplanation` for every result, and add deterministic unit/browser
coverage before exposing it in Battle UI. See `docs/RULES_ADAPTER.md`.

No active backlog defect blocks this sign-off.
