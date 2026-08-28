# Battle Builder backlog

## Working agreement

Every discovered defect, missing capability, performance issue, usability improvement, or visual issue is logged here, resolved in the active batch, and moved to the completed section with verification evidence. Phase 2 work is recorded separately only after Phase 1 sign-off.

## Active

_No active defects recorded._

## Completed

- **B11-001 — The 3D renderer recreated a WebGL scene for selection/preset
  updates and continued rendering when the board was idle.** Retained the scene
  across selection/preset updates, reused matching geometry/materials within a
  board scene, and switched to render-on-demand. Added 36×36/72×72 populated
  renderer profile coverage (72 and 288 pieces respectively), with conservative
  time budgets. Chromium observed 312 ms overhead / 598 ms 3D on 36×36 and
  444 ms overhead / 613 ms 3D on 72×72; production-preview checks were faster.
- **B11-002 — A lost WebGL context only left an inactive canvas, and the empty
  state could intercept its recovery controls.** Added an accessible in-place
  graphics-loss message with a safe return to overhead, and limited the empty
  state overlay to the overhead view. Verified in the production preview.
- **B11-003 — Routine parallel evidence tests wrote directly into canonical
  screenshots and could intermittently collide with a Windows file lock.**
  Ordinary runs now write stable captures to isolated Playwright output; the
  existing canonical evidence is refreshed only with the explicit
  `UPDATE_VISUAL_EVIDENCE` environment flag. Full 35-test Chromium suite
  passes without mutating review evidence.
- **B11-004 — Release constraints were documented but not mechanically guarded
  beyond a broad chunk-size report.** Added the lazy-3D manifest assertion and
  a release-hygiene script covering the production dependency allowlist, no
  R3F, the lazy Three.js boundary, and no remote font/asset references.

- **B10-001 — Phase 1 evidence was split across batch-specific captures and
  could not show the complete target-size review set in one location.** Added
  an isolated visual-evidence suite that produces all twenty required
  screenshots under `ux-audit/screenshots/`, together with a reviewed evidence
  matrix and manual interaction checklist.
- **B10-002 — Axe coverage was distributed across prior focused tests rather
  than explicitly proving every required state.** Added a single isolated axe
  sweep for zero state, every drawer, every inspector tab, and import recovery;
  it reports no serious or critical violation.

- **B09-001 — Terrain and 3D planning controls were not fully discoverable or
  operable without a pointer.** Added named, focusable SVG pieces with authored
  focus treatment; a semantic 3D terrain list; keyboard camera/build/access
  alternatives; selection announcements; and a keyboard placement command.
  Verified through isolated keyboard, reduced-motion, 3D, and axe browser flows.
- **B09-002 — Focus could be lost or feedback could rely on visual state in
  popovers, tabs, and transient pointer operations.** Added Popover Escape and
  restoration, focused tab roving, visible non-colour focus/lock/selection
  affordances, and safe 3D pointer cancel/lost-capture/blur cleanup. Verified
  with 30 Chromium checks and target-size focused-board captures.

- **B08-001 — Board actions were incomplete and split between placeholder menu
  feedback and unconnected persistence code.** Connected the single Board menu
  to New, Rename, browser Save/Open, board duplication, JSON export/import,
  Clear, and settings/help; added saved-board chooser, draft status, bounded
  undo/redo, and undoable destructive confirmations.
- **B08-002 — Import and corrupt-draft recovery could make a user uncertain
  whether a board was lost.** Added strict non-destructive import validation,
  clear recovery instructions, active-board retention on failure, and an
  initial corrupt-draft write guard. Verified with schema/history tests,
  isolated import/recovery browser flows, and desktop recovery captures.

- **B07-001 — The Build, Layers, and Setup drawers were placeholder shells,
  leaving planner controls undiscoverable.** Added a searchable grouped catalog
  with favorites, recents, collapsed categories, and immediate placement;
  layer search/select/multi lock-hide/reorder actions; and complete bounded
  dimensions, orientation, surface, and snap configuration. Verified with
  focused browser flows, axe scans, and target-size drawer captures.
- **B07-002 — The selection inspector did not expose editable type-aware
  properties or durable notes.** Replaced it with accessible Properties,
  Appearance, Structure, Access, and Notes tabs, including safe numeric drafts,
  terrain name/layer edits, roof/elevation controls, and notes. Verified in
  Chromium and inspector axe coverage.

- **B06-001 — The tactical board had rendered terrain but no safe construction
  workflow.** Added immutable construction commands with collision/bounds
  validation; Select, Build, neutral, and Access modes; snapped drag previews;
  multi-select/marquee; move, resize, rotate, duplicate, delete, and undo/redo;
  compatible union-footprint joins; and exterior door/window editing shared by
  overhead and 3D. Verified with 26 unit tests, 13 isolated browser checks, and
  selection-state captures at both desktop review sizes.
- **B06-002 — Cancellation, locking, invalid placement, and incompatible joins
  could leave unclear or unsafe transform outcomes.** Added pointer capture and
  cancel/lost-capture/blur recovery, bounded and collision-checked mutations,
  locked-piece protection, visual valid/invalid previews, and reasoned join
  feedback. Verified in focused Playwright construction flows.

- **B05-001 — Terrain pieces rendered as generic 3D boxes and did not share a
  tactical visual grammar with overhead.** Replaced them with a shared terrain
  catalog and geometry service, data-driven SVG cartography, corresponding 3D
  mesh parts/materials, stable labels, and structure door/window marks.
  Verified with 22 unit tests, isolated browser checks, and populated
  1440×960/1920×1080 overhead and 3D captures.
- **B05-002 — The zero-state overlay remained visible after loading terrain,
  obscuring the usable board.** Restricted the zero state to empty documents;
  populated boards now expose the full overhead or 3D planning surface.

- **B04-001 — The planner had no true 3D board view.** Added a lazy Three.js renderer sharing the B01 board, 1-inch grid scale, surface state, terrain meshes, camera presets, pointer controls, picking scaffold, resize cleanup, and separate lazy chunk budget.

- **B03-001 — The shell had a decorative board placeholder rather than a precision editing surface.** Replaced it with a renderer-neutral SVG viewport: fixed one-inch lines, 12-inch major references, board frame, origin/ruler labels, coordinate readout, surface variants, and clamped mouse/keyboard camera controls.

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
