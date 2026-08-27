# Battle Builder review log

## Status

Visual and manual interaction evidence is complete through B10. Required
evidence and results are recorded in [VISUAL_REVIEW.md](VISUAL_REVIEW.md) and
[MANUAL_INTERACTION_CHECKLIST.md](MANUAL_INTERACTION_CHECKLIST.md).

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

## B05 — tactical terrain and shared geometry verification (2026-08-26)

- Visual review passed for populated overhead and isometric 3D boards at
  1440×960 and 1920×1080. The board remains dominant; buildings, ruins,
  roads, water, walls, woods, rocks, scatter, objectives, tokens, and markers
  use distinct tactical symbols rather than generic translucent rectangles.
- Captures: `b05-populated-overhead-1440x960.png`,
  `b05-populated-overhead-1920x1080.png`,
  `b05-populated-3d-1440x960.png`, and
  `b05-populated-3d-1920x1080.png`; zero-state baseline captures are also
  retained at `b05-overhead-1440x960.png` and `b05-overhead-1920x1080.png`.
- `pnpm lint`, `pnpm typecheck`, `pnpm test` (22 tests), `pnpm build`,
  `pnpm bundle:check` (239.9 KiB initial / 350 KiB; 513.1 KiB lazy 3D /
  700 KiB), `pnpm audit`, and `pnpm test:e2e` (9 isolated Chromium checks)
  passed.
- The `agent-browser` CLI remains unavailable. Isolated Playwright was used
  for screenshot, console, viewport, and axe fallback verification.

## B06 — construction, transform, access, and join verification (2026-08-26)

- Visual review passed at 1440×960 and 1920×1080 for a selected structure with
  authored resize/rotate handles, the compact transform shelf, and the
  type-aware inspector. The board remains primary and no panel is clipped.
  Captures: `b06-construction-1440x960.png` and
  `b06-construction-1920x1080.png`.
- Unit coverage passed (26 tests): snapped piece construction, bounds and
  collision outcomes, resize access pruning, compatible union-footprint joins,
  attachment retention, and rejected gap/type joins.
- Isolated Playwright passed all 13 Chromium checks, including focused Build,
  Select, keyboard rotate, duplicate, Escape cancellation, Access door edit,
  unavailable join feedback, legacy workspace/3D flows, and target-size
  captures. Browser storage remained under the e2e fixture namespace.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm audit`, and
  `pnpm bundle:check` passed. Initial route is 259.0 KiB / 350 KiB; lazy 3D is
  513.1 KiB / 700 KiB. Playwright is used for browser review because the local
  `agent-browser` CLI is unavailable.

## B07 — functional workspace panels verification (2026-08-26)

- Visual review passed at 1440×960 and 1920×1080 for the compact Build,
  Layers, and Setup drawers. The Build catalog retains favorites/recent tools
  while collapsed groups prevent a dense, permanent sidebar. Captures:
  `b07-build-*`, `b07-layers-*`, and `b07-setup-*` at both desktop sizes.
- Focused browser coverage passed for catalog search and immediate arming,
  layer finding/selection/locking/visibility/order changes, safe board resize
  rejection when terrain would clip, surface/orientation/snap settings, and
  Appearance/Notes inspector controls. Axe reports no serious or critical
  violations for Build, Layers, Setup, or the inspector.
- Full verification passed: `pnpm lint`, `pnpm typecheck`, `pnpm test` (26
  unit tests), `pnpm build`, `pnpm audit`, `pnpm bundle:check`, and `pnpm
  test:e2e` (20 isolated Chromium checks). Initial route is 266.7 KiB / 350
  KiB; lazy 3D remains 513.1 KiB / 700 KiB.

## B08 — lifecycle, history, import/export, and recovery verification (2026-08-26)

- Visual import-recovery review passed at 1440×960 and 1920×1080. The dialog
  preserves the visible board, identifies the parsing problem, gives a clear
  corrective path, and keeps a single recovery action. Captures:
  `b08-import-recovery-1440x960.png` and
  `b08-import-recovery-1920x1080.png`.
- Lifecycle browser flows passed for menu-only New/Rename/Save/Open/Duplicate,
  downloadable JSON export, valid and malformed imports, undo after import,
  and confirmed Clear/multi-delete followed by Undo. Storage remains isolated
  through the Playwright fixture.
- Unit coverage now includes bounded history snapshots, redo branching, schema
  import validation, saved-library constraints, and corrupt draft fallback.
  Full verification passed: `pnpm lint`, `pnpm typecheck`, `pnpm test` (28
  unit tests), `pnpm build`, `pnpm audit`, `pnpm bundle:check`, and `pnpm
  test:e2e` (25 isolated Chromium checks). Initial route is 275.1 KiB / 350
  KiB; lazy 3D is 513.1 KiB / 700 KiB.

## B09 — accessibility and resilient-input verification (2026-08-26)

- Manual keyboard-path review and isolated browser coverage confirm named,
  focusable overhead terrain; an equivalent semantic 3D terrain list; keyboard
  selection, build placement, camera pan/zoom/reset, access creation, Layers,
  menu, inspector tab, and Popover Escape/focus restoration paths. Selection,
  locks, invalid previews, and focus have authored non-colour feedback.
- Pointer cancel, lost capture, window blur, touch input, browser focus, and
  reduced-motion paths clear transient work without committing a mutation.
  Axe has no serious or critical violations for the full 3D/overhead canvas
  workflow, drawers, inspector, dialogs, and recovery states.
- Visual review passed at 1440×960 and 1920×1080 for focused terrain states:
  `b09-accessibility-1440x960.png` and `b09-accessibility-1920x1080.png`.
  The focus ring remains distinct from the selection bracket and neither target
  view clips the board grid.
- Full verification passed: `pnpm lint`, `pnpm typecheck`, `pnpm test` (28
  unit tests), `pnpm test:e2e` (30 isolated Chromium checks), `pnpm build`,
  `pnpm audit`, and `pnpm bundle:check` (277.6 KiB initial / 350 KiB;
  514.7 KiB lazy 3D / 700 KiB).

## B10 — evidence, regression, and audit verification (2026-08-26)

- Added a consolidated isolated Playwright evidence suite that captures every
  required review state at 1440×960 and 1920×1080. The complete set of twenty
  stable-name assets is under `ux-audit/screenshots/`; the assessment is in
  `VISUAL_REVIEW.md` and the replayed manual checklist is in
  `MANUAL_INTERACTION_CHECKLIST.md`.
- The visual review passes: empty state, overhead, isometric and perspective
  3D, Build/Setup/Layers, selected inspector, invalid collision feedback, and
  import recovery have no clipping or known defect at either target size.
- Axe now explicitly sweeps the zero state, four drawers, all five relevant
  inspector tabs, and import-error dialog. It reports no serious or critical
  violations. The storage-isolation fixture continues to rewrite all draft
  keys away from `battle-builder/v1/`.
- Full verification passed: `pnpm lint`, `pnpm typecheck`, `pnpm test` (28
  unit tests), `pnpm test:e2e` (33 isolated Chromium checks), `pnpm build`,
  `pnpm audit`, and `pnpm bundle:check` (277.6 KiB initial / 350 KiB;
  514.7 KiB lazy 3D / 700 KiB).
