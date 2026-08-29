# Battle Builder review log

## Status

Phase 1 is signed off through B12. Required evidence and results are recorded
in [VISUAL_REVIEW.md](VISUAL_REVIEW.md),
[MANUAL_INTERACTION_CHECKLIST.md](MANUAL_INTERACTION_CHECKLIST.md), and
[PHASE_1_SIGNOFF.md](PHASE_1_SIGNOFF.md).

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

## B11 — performance, release hygiene, and delivery verification (2026-08-28)

- Remediated the actual 3D renderer lifecycle issue: selection and preset
  changes no longer recreate the scene, matching geometry/materials are reused
  for the current board, and rendering is requested only after a visible
  change. The lazy renderer remains isolated from the overhead entry route.
- Isolated Chromium profile coverage passed for populated boards in both
  renderers: 36×36 with 72 pieces observed 312 ms overhead / 598 ms 3D, and
  72×72 with 288 pieces observed 444 ms overhead / 613 ms 3D. Conservative
  regression limits are 5 s overhead and 8 s 3D. Production preview observed
  78 ms / 465 ms and 103 ms / 461 ms respectively.
- Production-preview lifecycle verification passed all six focused Chromium
  flows: Save/Rename/Duplicate/Open/Export, valid/malformed import recovery,
  destructive undo, both profile boards, lazy 3D, presets, and context-loss
  return to overhead. The board remains unchanged during the fallback.
- `pnpm lint`, `pnpm typecheck`, `pnpm test` (28), `pnpm test:e2e` (35),
  `pnpm build`, `pnpm audit`, `pnpm bundle:check`, and `pnpm release:hygiene`
  passed. The entry route is 277.8 KiB / 350 KiB; the explicitly lazy 3D chunk
  is 516.4 KiB / 700 KiB. The production audit reports no known
  vulnerabilities. The hygiene script confirms the small allowlisted
  production dependency set, no R3F, lazy-only Three.js import, and no remote
  fonts/assets.
- README now covers purpose, setup, scripts, document compatibility, storage,
  camera/input controls, accessibility, browser support, and WebGL fallback.
  Canonical screenshots remain under `ux-audit/screenshots/`; regular evidence
  test runs use isolated output to avoid transient Windows screenshot locks.

## B12 — Phase 1 readiness sign-off (2026-08-28)

- Replayed the documented desktop planner paths at 1440×960 and 1920×1080:
  board/grid, overhead and 3D camera controls, construction, selection,
  transforms, Access, layers, Setup, inspector, lifecycle/recovery, keyboard,
  focus, and visual evidence states. No acceptance item failed.
- Added a final isolated readiness replay covering exact 36×36 and 72×72
  grid-line counts, safe maximum-size configuration, real mouse orbit/pan,
  wheel/keyboard camera controls, presets, and clean page-error state at both
  desktop targets.
- Confirmed `BoardDocument` and the shared geometry service are renderer
  neutral and that no Phase 2 rules, units, turns, combat, or replay UX exists
  in production source. The sign-off decision and evidence matrix are in
  [PHASE_1_SIGNOFF.md](PHASE_1_SIGNOFF.md).

## B13 — simulation contracts and deterministic event engine (2026-08-28)

- Added an isolated, versioned `BattleSession` model with a validated board
  reference/snapshot, immutable terrain facts, adapter reference, factions,
  units, objectives, turn state, typed event history, and replay metadata.
  `BoardDocument`, renderer contracts, planner persistence, and workspace UI
  were not changed.
- The pure reducer handles session creation, unit deployment, phase changes,
  move intent, seeded bounded roll request/result, objective state, and log
  entries. It uses no clock or ambient randomness; replaying the serialized
  creation command and command sequence reproduces state and events exactly.
- Session imports/exports and recoverable local drafts validate both the
  runtime schema and replay integrity. Session storage uses only
  `battle-builder/v1/session/draft`, leaving the planner draft untouched.
- Full verification passed: `pnpm lint`, `pnpm typecheck`, `pnpm test` (36),
  `pnpm build`, `pnpm audit`, `pnpm bundle:check`, `pnpm release:hygiene`, and
  `pnpm test:e2e` (37 isolated Chromium tests). The initial route remains
  277.8 KiB / 350 KiB; the lazy 3D chunk remains 516.4 KiB / 700 KiB. B13 adds
  no Battle mode UI, deployment UX, rules adapter, combat, or simulator view.

## B14 — battle mode, roster, and deployment (2026-08-28)

- Added an explicit Battle-mode transition that locally saves the active board
  first, then restores only a matching session snapshot or creates a fresh
  deterministic deployment session. Returning to Build mode preserves both
  the untouched planner and the session draft.
- Battle mode replaces planner-only rail/drawers with accessible Roster and
  Deploy surfaces. It includes factions, unit-template cards, unit cards,
  objective markers, selection inspector, faction deployment zones, and
  generic board-boundary, zone, occupancy, and blocking-terrain feedback.
  Rules-specific calculations, attacks, movement resolution, dice UI, turns,
  logs, and adapters remain deferred to B15/B16.
- Units/objectives are visible and selectable in the shared overhead and 3D
  board presentations. B14 visual captures at both target desktop sizes are
  `screenshots/b14-battle-overhead-1440x960.png` and
  `screenshots/b14-battle-overhead-1920x1080.png`.
- Full verification passed: `pnpm lint`, `pnpm typecheck`, `pnpm test` (38),
  `pnpm build`, `pnpm audit`, `pnpm bundle:check`, `pnpm release:hygiene`, and
  `pnpm test:e2e` (41 isolated Chromium tests). Initial bundle size is
  305.5 KiB / 350 KiB; the lazy 3D chunk remains 516.4 KiB / 700 KiB.

## B15 — rules-adapter framework and tactical resolution (2026-08-28)

- Added a versioned, renderer-neutral `RulesAdapter` contract that owns unit
  profiles, phases, legal actions, movement, range, terrain effects, cover,
  line of sight, legal targets, objective scoring, and seeded roll resolution.
  Every result carries a typed human-readable explanation listing inputs,
  assumptions, terrain contributions, rolls, and its legal/illegal/resolved
  outcome.
- Added pure one-inch grid spatial helpers: deterministic four-way BFS
  movement, square-grid range, terrain occupancy, supercover LOS/cover rays,
  elevation hooks, and stable legal-target ingredients. They contain no
  renderer, browser, clock, or ambient-random dependency.
- Added `battle-builder-generic@1`, an original, explicitly non-third-party
  skirmish reference adapter. Its documented scope supports deterministic
  integration testing without implying compatibility with any licensed rules
  system. B15 deliberately adds no action controls, turn UX, replay, event-log
  UI, or battle result UI; those remain B16.
- Focused unit coverage now has 47 passing tests, including blocked movement,
  route detours, range, terrain cover, LOS blockers/elevation, legal targets,
  objectives/contesting, invalid phase actions, and exact seeded-roll replay.
  Full verification passed: `pnpm lint`, `pnpm typecheck`, `pnpm test`,
  `pnpm build`, `pnpm audit`, `pnpm bundle:check`, `pnpm release:hygiene`, and
  the 41-test isolated Chromium regression suite. Initial bundle remains
  305.5 KiB / 350 KiB and the lazy 3D chunk remains 516.4 KiB / 700 KiB.

## B16 — battle interaction, explanations, replay, and logs (2026-08-28)

- Added the Battle Command workspace: deliberate phase progression, selected
  unit action selection, deterministic movement/attack/objective previews,
  plain-language calculation explanations, and disabled confirmation for
  illegal actions. Confirmed moves now update the shared battle position using
  the existing deterministic command/history reducer; attack and objective
  confirmations record seeded roll and objective events respectively.
- Added filterable event/roll/phase/action audit history, calculation detail,
  copyable deterministic seed, and step replay controls. Replay is explicitly
  labelled read-only and live mutations report a recovery message until the
  operator returns to live state. Battle selection and 3D/overhead switching
  remain on the existing shared board surface.
- Focused isolated Chromium coverage passed for a complete generic command,
  replay entry/exit, invalid movement recovery, and reduced-motion operation.
  `pnpm lint`, `pnpm typecheck`, `pnpm test` (47), `pnpm build`, `pnpm
  bundle:check`, `pnpm audit`, and `pnpm release:hygiene` passed. Initial
  route is 329.7 KiB / 350 KiB; lazy 3D remains 516.4 KiB / 700 KiB.
