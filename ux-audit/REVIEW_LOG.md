# Battle Builder review log

## Status

Visual and manual interaction review begins after B10. Required evidence is
defined in [JOB_BATCHES.md](JOB_BATCHES.md).

## B00 — project baseline verification (2026-08-26)

- `pnpm lint` — passed with zero warnings.
- `pnpm typecheck` — passed under strict TypeScript.
- `pnpm test` — passed (1 baseline test).
- `pnpm build` — passed; Vite production output generated successfully.
- `pnpm audit` — passed with no known production vulnerabilities.
- `pnpm bundle:check` — passed; initial route is 190.1 KiB of the 350 KiB
  budget, and no lazy chunks exist yet.
- `pnpm test:e2e` — passed (1 Chromium isolated-storage test). Playwright
  started a fresh local Vite server and wrote only the e2e draft namespace.

No product visual review was performed in B00; B10 owns visual regression and
manual interaction evidence.

## B01 — board document and persistence verification (2026-08-26)

- `pnpm lint` — passed with zero warnings.
- `pnpm typecheck` — passed under strict TypeScript.
- `pnpm test` — passed (16 tests across schema, migration, persistence, and
  baseline suites).
- `pnpm build` and `pnpm bundle:check` — passed; the initial route remains
  190.1 KiB of its 350 KiB budget.
- `pnpm audit` — passed with no known production vulnerabilities.
- `pnpm test:e2e` — passed; the isolated Chromium context continues to rewrite
  storage keys away from the user draft namespace.

No visual review was required for the renderer-neutral document batch. B02 and
B03 own the first visible workspace and board review.

## B02 — workspace shell verification (2026-08-26)

- Visual review passed at 1440×960 and 1920×1080. The board surface remains
  dominant, drawers overlay without leaving permanent blank columns, and the
  compact rail/top bar retain the intended restrained cyan/navy command style.
  The actual SVG one-inch grid is explicitly deferred to B03.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm audit`, and
  `pnpm bundle:check` all passed. The initial route is 223.1 KiB of the
  350 KiB budget.
- `pnpm test:e2e` passed all 6 Chromium checks: isolated storage, both desktop
  target sizes, drawer/menu/dialog keyboard behavior, focus restoration, and
  axe scans of the shell and Build drawer with no serious or critical issues.
- The `agent-browser` CLI required by the local browser-verification skill was
  unavailable in this environment. The project’s existing isolated Playwright
  runner was used as the safe fallback for browser, console, axe, and viewport
  verification; this is not a product blocker.

## B03 — overhead surface verification (2026-08-26)

## B04 — 3D planning verification (2026-08-26)

- Lazy Three.js renderer passed browser verification at the desktop target sizes, including 3D view loading, preset changes, overhead return, picking scaffold, and WebGL context-loss fallback event handling.
- Full suite passed: lint, strict typecheck, 18 unit tests, 7 isolated Playwright/axe tests, production audit, and build. Initial route is 228.0 KiB; the separately lazy 3D chunk is 501.7 KiB, within its 700 KiB budget.

- SVG grid/camera unit tests passed for 36-inch line counts, 12-inch major
  references, and clamped pan/zoom behavior; the full unit suite now has 18
  passing tests.
- Browser checks passed at 1440×960 and 1920×1080 with the overhead SVG in the
  workspace. Mouse wheel/middle or Shift drag, arrows, +/- and F control the
  camera; no 3D code was introduced.
- `lint`, `typecheck`, build, bundle:check (225.8 KiB / 350 KiB), audit, and
  isolated Playwright/axe checks all passed.
