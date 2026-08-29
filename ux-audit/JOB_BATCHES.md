# Battle Builder — delivery job batches

## Mission

Build a desktop-first tactical board planner that is fully complete, quality-verified, and safe to become the spatial foundation for Phase 2 simulation. It must support precision overhead editing and an interactive 3D planning view from one shared board document.

Phase 1 mechanics end at B12. B13 begins the deliberately separate Phase 2
simulation foundation; later batches remain gated by their direct dependencies.

## Agent execution protocol

1. Before a batch, read [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md), this file, the current [BACKLOG.md](BACKLOG.md), and the relevant source/tests.
2. Work only inside `D:\AI-Workstation\Antigravity\apps\Battle Builder`; do not use prior Wargame Wizard folders or C: as a project location.
3. Treat the supplied Cyberpunk Planner as a theme and baseline interaction foundation only. Do not copy its code, imagery, fonts, or bundled assets.
4. Implement the entire batch, run its verification commands, perform its stated visual/interaction review, then update the batch status and `BACKLOG.md` before handing off.
5. Log every found defect, missing capability, visual issue, performance issue, or usability improvement in `BACKLOG.md`. Complete it before calling the active batch finished, unless it is explicitly deferred as a Phase 2 item.
6. Preserve user data: browser automation must use a dedicated isolated storage context. Never overwrite the real local draft while testing.
7. Do not begin a later batch when the current batch’s completion gate is unmet.

## Batch status

| ID | Batch | Depends on | Status |
| --- | --- | --- | --- |
| B00 | Project baseline and repository | — | Complete |
| B01 | Board document, migrations, and persistence | B00 | Complete |
| B02 | Design system and workspace shell | B00 | Complete |
| B03 | Overhead editor, 1-inch board grid, and camera | B01, B02 | Complete |
| B04 | 3D planning renderer and camera | B01, B02, B03 | Complete |
| B05 | Tactical terrain catalog and shared geometry | B01, B03, B04 | Complete |
| B06 | Build, transform, structure, access, and join tools | B03, B04, B05 | Complete |
| B07 | Drawers, layers, inspector, and board settings | B01, B02, B05, B06 | Complete |
| B08 | Board lifecycle, history, import/export, and recovery | B01, B06, B07 | Complete |
| B09 | Accessibility and resilient input completion | B02–B08 | Complete |
| B10 | Automated tests, visual regression, and audit assets | B01–B09 | Complete |
| B11 | Performance, release hygiene, and GitHub delivery | B10 | Complete |
| B12 | Manual sign-off and Phase 2 readiness gate | B11 | Complete |
| B13 | Simulation contracts and deterministic event engine | B12 | Complete |
| B14 | Battle mode, factions, units, and deployment | B13 | Complete |
| B15 | Rules-adapter framework and tactical resolution | B13, B14 | Complete |
| B16 | Battle interaction, explanations, replay, and logs | B14, B15 | Complete |
| B17 | Simulation accessibility, test evidence, and release hygiene | B13–B16 | Complete |
| B18 | Phase 2 sign-off and future-rules readiness gate | B17 | Complete |
| B19 | Board planner precision and clarity pass | B18 | Complete |
| B20 | Structure interiors and semantic terrain | B19 | Planned |

---

## B00 — Project baseline and repository

**Goal:** Establish a clean, reproducible project that is separate from all old work and ready for continuous implementation.

### Work

- Verify the project root is `D:\AI-Workstation\Antigravity\apps\Battle Builder`.
- Inventory user-owned reference folders but exclude them from the application source bundle and TypeScript/lint scans.
- Initialize the Battle Builder repository, set `origin` to `https://github.com/ProbablyMaybeNo/battlebuilder.git`, verify remote access, and create the intended default branch. Do not change the broad parent repository.
- Pin Node and package-manager expectations; commit one lockfile.
- Establish Vite + React + strict TypeScript, ESLint, Vitest, Playwright, axe, dependency audit, production build, and bundle-budget scripts.
- Add `.gitignore`, README, contributor/agent handoff notes, and an explicit license decision.
- Add `ux-audit/BACKLOG.md`, `ux-audit/REVIEW_LOG.md`, and a stable screenshot naming convention.
- Configure tests to use isolated storage from their first run.

### Completion gate

- `lint`, `typecheck`, `test`, `build`, `audit`, and `bundle:check` scripts exist and are documented.
- The repository has the correct remote and a clean initial commit when GitHub authentication is available.
- No copied Cyberpunk Planner code/assets ship with the product.

---

## B01 — Board document, migrations, and persistence

**Goal:** Make the board document a safe, versioned, renderer-neutral contract for all future editor and simulator work.

### Work

- Define a versioned `BoardDocument` with IDs, name, timestamps, 36×36 default settings, max 72×72 board bounds, surface/orientation preferences, and ordered pieces.
- Define `Piece` plus structure-specific data: cell/polygon footprint, rotation, elevation/height, doors, windows, roof/interior display mode, lock/hidden/layer/notes state.
- Enforce one-inch cells. Remove configurable grid-size behavior from the model and UI.
- Add runtime validation for all document and nested values: supported version/type, finite numbers, integer board dimensions, IDs, duplicate IDs, dimensions, rotations, layers, footprints, attachment boundaries, and setting constraints.
- Add migration registry and migration tests, including the no-op v1 migration path.
- Implement local draft persistence using a namespaced key, debounced writes, restore at startup, safe corrupt-draft fallback, and explicit save state.
- Implement a small local saved-board index for New/Open/Duplicate/Rename without mixing user drafts with test data.
- Write schema, migration, persistence, and constraints unit tests.

### Completion gate

- Invalid imports/drafts never replace the active document.
- Every persisted document can be parsed into the same renderer-neutral model.
- New boards default to 36×36 inches; no axis can exceed 72 inches.

---

## B02 — Design system and workspace shell

**Goal:** Build the coherent Cyberpunk-Planner-derived command workspace before implementing individual board tools.

### Work

- Create scoped design tokens for near-black/navy layers, cyan system state, restrained violet secondary state, warning/error amber/coral/red, typography, spacing, surfaces, borders, shadows, and motion.
- Build the slim top document bar: app identity, editable board name, save state, undo/redo, and exactly one Board menu.
- Build the 56–72 px activity rail with Board, Build, Layers, and Setup launchers.
- Build reusable accessible buttons, icon buttons, menus, drawers, popovers, dialogs, tabs, numeric controls, tooltips, toasts, and live region.
- Create an on-demand drawer framework with focus management, Escape behavior, focus restoration, no clipping, and no permanent blank columns.
- Create the contextual canvas control shelf and selection-only inspector container.
- Build the designed zero state with Build/Add terrain and Starter layout actions.
- Add reduced-motion behavior and desktop resilience for 1440×960 and 1920×1080 first.

### Completion gate

- The empty shell is recognizably a professional board-planning product—not an admin dashboard or raw debug canvas.
- There are no duplicated document controls, permanent blank sidebars, clipped drawers, or inaccessible menu/dialog behavior.

---

## B03 — Overhead editor, 1-inch board grid, and camera

**Goal:** Deliver the precise, fast editing surface.

### Work

- Implement the SVG overhead board viewport with correct viewBox/camera transforms and no accidental gutters.
- Render the fixed 1-inch grid for all boards; render heavier major lines on 12, 24, 36, 48, 60, and 72 inches as applicable.
- Render board bounds, corners, axes, ruler ticks, origin/reference markers, scale, coordinate readout, and the default 36×36 framing.
- Add surface treatments for midnight, concrete, and sand while preserving grid readability.
- Implement wheel and keyboard zoom, pan via middle drag / Space+left-drag / arrows, fit/reset via `F`, and accessible control-shelf equivalents.
- Implement camera clamping, window-resize handling, reduced-motion-safe transitions, and cursor-coordinate conversion.
- Implement zero-state presentation inside the board, not as a dashboard card.
- Unit-test coordinate transforms, 1-inch/12-inch grid generation, bounds, and camera movement.

### Completion gate

- At 1440×960 and 1920×1080, the board is dominant and the 36×36 one-inch grid is crisp, legible, and intentional.
- Pan/zoom/fit works with mouse and keyboard without breaking selection or causing canvas drift.

---

## B04 — 3D planning renderer and camera

**Goal:** Add a true interactive 3D planning view based on the same board document—not a static isometric illustration.

### Work

- Implement a lazy-loaded Three.js renderer and a renderer-neutral geometry adapter; only production-used modules may enter the bundle.
- Render a 1-inch board grid and major 12-inch references in 3D, with the same size, surface, piece placement, hidden state, and selection state as overhead.
- Add top-down, isometric, perspective, and front-side camera presets; `1`, `2`, `3`, `4` select presets as documented.
- Add orbit via right drag or Alt+left drag; pan via middle drag, Space+left drag, or arrows; zoom via wheel/`+`/`-`; fit/reset via `F`.
- Prevent camera controls from conflicting with Select/Build gestures. Suppress browser context menu only on the board while right-drag orbit is enabled.
- Add 3D selection/picking and selection synchronization with overhead and inspector. Preserve selection and camera intent when changing views.
- Add lighting/materials that preserve readability on ordinary desktop GPUs; reuse/instance repeated primitives; handle context loss gracefully.
- Test controls, view synchronization, renderer fallback, and lazy chunk loading.

### Completion gate

- The same 36×36 board can be inspected in accurate overhead, isometric, and perspective views, with real orbit/pan/zoom and no duplicate board state.
- Opening the 3D view does not compromise the initial overhead route bundle budget.

---

## B05 — Tactical terrain catalog and shared geometry

**Goal:** Make each piece look and behave like tactical terrain in both renderers.

### Work

- Build searchable, grouped catalog data for buildings, ruins, platforms, roads, water, walls, woods, rocks, scatter, objectives, tokens, and markers.
- Add category metadata, defaults, valid resize ranges, dimensions, labels, accessible names, favourites, and recents.
- Create shared footprint/mesh definitions so 2D and 3D representations remain semantically aligned.
- Implement cartographic symbols: inset building walls, roof/interior mode, orientation cue, doors/windows, roads, water, walls, woods, rocks, scatter, objectives, and markers.
- Add object naming rules that ensure unique, stable, meaningful labels—never repeated generic “OBJ” labels.
- Implement quiet unselected labels and collision-aware selected/hover callouts/measurements.
- Implement visual states: normal, hover, selected, multi-selected, dragging, resizing, rotating, valid, invalid, locked, hidden, and disabled.

### Completion gate

- No terrain category appears as a generic semi-transparent rectangle in either view.
- Symbols and labels remain readable over the full practical zoom range and all tactical states are distinguishable.

---

## B06 — Build, transform, structure, access, and join tools

**Goal:** Deliver the core board construction workflow.

### Work

- Implement Select, Build, and neutral modes with clear tool state and keyboard shortcuts.
- Implement drag-to-size construction: choose a catalog item, pointer-down on a snapped cell, drag a valid/invalid preview, release to create one history command. Display live inch dimensions.
- Implement placement, click select, Shift multi-select, intersecting-object marquee, keyboard selection, move, duplicate, delete, and predictable deselection.
- Implement pointer capture for all drag, marquee, resize, and rotate operations. Recover safely from pointer cancel, lost capture, Escape, and window blur.
- Implement snapping, collision/overlap, off-board, locked, hidden, alignment-guide, and invalid placement feedback.
- Implement direct resize/rotate handles with labels, tooltips, hit targets, pointer and keyboard controls.
- Add rectangle and union-footprint structure model. Join only compatible, unlocked, edge-adjacent structures with valid combined outlines; provide reasoned disabled state otherwise.
- Add Access mode: create, move, resize, and delete doors/windows on valid exterior structure walls; validate them after all geometry changes; render in 2D and 3D.
- Add inspector-equivalent controls for movement, dimensions, rotation, height, roof/interior, and access features.
- Unit/integration-test all transforms, constraints, joins, access validation, and cancellation paths.

### Completion gate

- A user can construct, size, move, edit, access-detail, join, duplicate, and remove tactical structures using mouse or keyboard without data corruption.
- All user-visible construction changes are safely undoable/redoable.

---

## B07 — Drawers, layers, inspector, and board settings

**Goal:** Make the full planner discoverable without cluttering the board.

### Work

- **Build drawer:** searchable grouped library, collapsed categories, recent tools, favourites, selected-tool preview, and immediate placement flow.
- **Layers drawer:** search, object discovery, selection, ordering, lock/unlock, show/hide, and multi-piece context actions.
- **Setup drawer:** 36×36 default configuration; dimensions from 12 to 72 inches; orientation, surface, snap, view preferences, and clear validation. No grid-size control.
- **Board drawer:** board summary, help, open/save flows, and non-duplicated document actions.
- Implement type-aware 320–380 px selection inspector with accessible horizontal tabs. Include only relevant controls by terrain type.
- Add tabs for Properties, Appearance/Structure, Access (when applicable), and Notes; no crowded/hidden critical controls.
- Implement number-input draft state so empty/partial typing remains possible and commits normalize safely with understandable errors.
- Ensure drawers and inspector never intercept unrelated board interactions or collapse to a useless sliver.

### Completion gate

- A new user can find and use every object, layer, setting, and selection property without a permanent wide sidebar or duplicated actions.
- All panel interactions work keyboard-only with correct focus/escape behavior.

---

## B08 — Board lifecycle, history, import/export, and recovery

**Goal:** Complete all user-visible board management safely.

### Work

- Implement New, Rename, Save, Open, Duplicate, Export JSON, Import JSON, and Clear Board from the single Board menu.
- Build immutable bounded undo/redo across every visible mutation: catalog placement, transform, structure/access edit, setting, layer, visibility/lock, reorder, join, duplicate, delete, clear, import, and starter layout.
- Add Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z support.
- Add confirmation dialogs for Clear and multi-delete; both actions remain undoable.
- Validate every import before replacing state. On failure retain the original board and show exact plain-language recovery steps.
- Include schema version in export; test duplicate ID, malformed JSON, invalid types/settings, unsupported version, malformed attachments, and corrupt local draft recovery.
- Preserve selection consistently across history and lifecycle operations.

### Completion gate

- Every board mutation has a deterministic history result.
- Import failure cannot damage an active board, and all lifecycle controls are discoverable in one place.

---

## B09 — Accessibility and resilient input completion

**Goal:** Ensure the completed planner is usable and robust for keyboard, screen-reader, pointer, and reduced-motion users.

### Work

- Make every SVG/3D-board piece focusable, labelled, keyboard-selectable, and represented in Layers.
- Complete semantic landmarks, roles, names, focus indicators, authored SVG selection brackets, tooltips, and live announcements.
- Verify modal focus traps, menu/drawer/popover focus management, Escape close, focus restoration, and tab navigation.
- Provide keyboard alternatives for all camera, build, selection, move, resize, rotate, access, layer, and menu actions.
- Ensure colour is never the only feedback for selected, invalid, locked, hidden, or warning states.
- Audit pointer operations under touch/pointer cancel, capture loss, window blur, browser zoom, and reduced motion.
- Run axe checks and manual screen-reader/keyboard path checks; remediate all actionable issues.

### Completion gate

- The essential board workflow can be completed without a mouse.
- axe has no serious/critical violations and manual focus behavior passes the documented matrix.

---

## B10 — Automated tests, visual regression, and audit assets

**Goal:** Turn the completed functionality into a repeatable verification suite and audit trail.

### Work

- Complete unit, integration, and Playwright coverage for all B01–B09 requirements.
- Make Playwright self-start, use an isolated browser profile/storage, and never write the real local-draft key.
- Add axe coverage for workspace, all drawers, inspector tabs, dialogs, import error recovery, and zero state.
- Capture visual regression/reference screenshots at 1440×960 and 1920×1080 for:
  - empty board and zero state;
  - populated overhead board;
  - isometric 3D board;
  - perspective 3D board;
  - Build, Setup, and Layers drawers;
  - selected inspector;
  - invalid placement;
  - import error recovery.
- Store images and a short visual assessment under `ux-audit/`; never use copied reference imagery in captures.
- Add a manual interaction checklist and record findings/remediations in `REVIEW_LOG.md` and `BACKLOG.md`.

### Completion gate

- All required test suites pass in clean isolated storage.
- All required desktop visual assets exist at both resolutions and show no known visual defect.

---

## B11 — Performance, release hygiene, and GitHub delivery

**Goal:** Make the planner fast, maintainable, and deliverable.

### Work

- Profile populated 36×36 and maximum 72×72 boards in both renderers; eliminate needless re-renders, heavy SVG churn, and excess 3D geometry/material allocations.
- Enforce bundle budgets: small overhead entry route, separately budgeted lazy 3D chunk, no unused WebGL/R3F code, and no remote fonts.
- Run production dependency audit and remove/replace unacceptable dependencies.
- Validate production build, preview route, export/import, and context-loss fallback.
- Complete README: product purpose, local setup, scripts, board document compatibility, input controls, accessibility notes, and known browser support.
- Update all implementation/audit docs; ensure every backlog item is resolved.
- Commit the finished work in logical commits, push to `ProbablyMaybeNo/battlebuilder`, and verify the GitHub remote reflects the intended project. If authentication blocks pushing, record the exact user action needed without claiming delivery.

### Completion gate

- Production build, lint, typecheck, tests, axe, audit, and bundle budgets pass.
- Repository is clean, documented, and pushed to the requested remote when credentials permit.

---

## B12 — Manual sign-off and Phase 2 readiness gate

**Goal:** Make the evidence-based decision that Phase 1 is complete and the board model is ready for the simulator.

### Work

- Perform full manual review at 1440×960 and 1920×1080 in overhead, isometric, and perspective modes.
- Test mouse/keyboard camera controls, pan/orbit/zoom, construction drag, selection, multi-select, marquee, move, resize, rotate, access features, joining, layers, setup, inspector, history, local restore, import/export, dialogs, destructive recovery, and focus restoration.
- Verify all 1-inch grid and 12-inch major-line behavior on 36×36 and 72×72 boards.
- Confirm board and structure data can be read without renderer-specific fields; document the Phase 2 adapter boundary and explicitly verify no Phase 2 UX leaked into the editor.
- Reconcile all screenshot evidence, test results, review notes, and backlog items.
- Produce `ux-audit/PHASE_1_SIGNOFF.md` with pass/fail evidence. Do not mark pass if any critical, high-severity, or acceptance-criterion item remains.

### Completion gate

- The sign-off document records a genuine visual and functional pass, with all acceptance criteria met.
- The team may then create the Phase 2 simulator batch plan; no simulator code is part of this completion.

---

# Phase 2 — Tactical simulation batches

## B13 — Simulation contracts and deterministic event engine

**Goal:** Establish a simulation data model and deterministic engine that consume the signed-off board document without changing or polluting planner state.

### Work

- Define a versioned `BattleSession` document separate from `BoardDocument`, with board reference/snapshot, seed, adapter identifier/version, factions, units, objectives, turn state, event history, and replay metadata.
- Create a deterministic pseudorandom source with explicit seed, serializable state, bounded roll API, and reproducible replay tests.
- Implement typed simulation events/commands and a pure reducer: session create, deploy, phase change, move intent, roll request/result, objective state, and log entries.
- Implement strict runtime validation, migration registry, import/export, local persistence, and non-destructive recovery for battle sessions.
- Define the immutable bridge from board pieces to simulation terrain facts; never add simulator-only fields to the Phase 1 board document.
- Add unit tests for seed replay, event determinism, validation, migration, persistence isolation, and board-to-session conversion.

### Completion gate

- Replaying the same commands with the same seed yields identical state and event history.
- Board editing and battle session persistence remain completely separate and safe.

---

## B14 — Battle mode, factions, units, and deployment

**Goal:** Add a separate, discoverable Battle mode that loads board data without cluttering the finished editor.

### Work

- Add an explicit mode transition between Build and Battle, with unsaved-state safeguards and clear visual mode identity.
- Implement factions, unit templates, unit instances, unit cards, roster management, and accessible faction/unit selection.
- Implement deployment zones and a deployment phase with board bounds, occupancy, terrain, and adapter validation feedback.
- Render units and objectives in both overhead and 3D views, with selection, visibility, labels, layer discovery, and a non-destructive return to Build mode.
- Add battle-specific drawers/inspector only within Battle mode; retain Phase 1’s compact UI and avoid duplicate controls.
- Test deployment, mode switching, persistence, keyboard control, and browser-state isolation.

### Completion gate

- A user can set up a deterministic battle session from a saved board, add factions/units, deploy legally, and return to the untouched planner.

---

## B15 — Rules-adapter framework and tactical resolution

**Goal:** Implement understandable, testable tactical calculations while keeping game-specific rules pluggable.

### Work

- Define the rules-adapter interface for unit profiles, phases, legal actions, movement, range, terrain effects, cover, line of sight, objective scoring, and roll resolution.
- Implement a documented generic skirmish adapter for end-to-end testing; do not imply it is a licensed third-party ruleset.
- Build pure spatial helpers for grid movement/range, terrain occupancy, line-of-sight ray checks, intervening cover, elevation hooks, and legal-target determination.
- Route every calculation through adapter-provided explanations that identify inputs, assumptions, terrain contributions, rolls, and outcome.
- Unit-test edge cases for blocked movement, cover, line of sight, range, objectives, invalid actions, and deterministic rolls.

### Completion gate

- Every displayed tactical result is deterministic, adapter-owned, inspectable, and accompanied by a human-readable explanation.

---

## B16 — Battle interaction, explanations, replay, and logs

**Goal:** Turn deterministic state and rules into a calm, usable tactical command experience.

### Work

- Implement turn/phase progression, action selection, movement previews, target/range/LOS overlays, cover feedback, objective interactions, and explicit action confirmation.
- Build an event log and roll history with filters, meaningful event summaries, calculation detail, copyable seed, and replay controls.
- Implement session playback/scrubbing from a seed and command history; distinguish replay/read-only state from live play.
- Add clear conflict, invalid-action, and recovery states; no unexplained disabled controls or hidden calculation outcomes.
- Synchronize battle state across overhead and 3D views without introducing camera or selection regressions.
- Add browser/integration coverage for a full deterministic scenario, replay, error recovery, and reduced-motion operation.

### Completion gate

- A full generic skirmish scenario can be played, understood, replayed from its seed, and audited through its event log.

---

## B17 — Simulation accessibility, evidence, and release hygiene

**Goal:** Prove that Battle mode is accessible, performant, deterministic, and production-ready.

### Work

- Complete keyboard and assistive-technology paths for mode switching, deployment, turn/phase control, action selection, log navigation, replay, and tactical overlays.
- Run axe checks across all Battle mode states; ensure colour is never the only signal for faction, target, invalid, cover, range, or phase state.
- Profile populated planner-plus-battle sessions at 36×36 and 72×72 in both renderers; remediate real performance issues and maintain bundle budgets.
- Add isolated Playwright regression/evidence suite and 1440×960/1920×1080 captures for deployment, active turn, target/LOS/cover, roll explanation, log/replay, invalid action, and Battle-to-Build return.
- Run lint, strict typecheck, unit/integration/E2E/axe, production build, audit, bundle budget, and production-preview recovery checks.
- Update README, adapter documentation, backlog, and review log.

### Completion gate

- All simulation checks pass in isolated storage; required visual evidence exists at both desktop resolutions; no active backlog issue remains.

---

## B18 — Phase 2 sign-off and future-rules readiness gate

**Goal:** Make an evidence-based decision that the generic simulation layer is complete and safe for additional rules systems.

### Work

- Perform a full desktop review of Build-to-Battle transition, deployment, generic scenario play, deterministic replay, logs, invalid actions, and Build return at both target resolutions.
- Verify identical outcomes for repeated seed/command histories and document the replay verification.
- Confirm board documents remain compatible and independent; verify new adapters can be added without modifying planner or engine internals.
- Reconcile screenshots, test results, performance measurements, documentation, and backlog.
- Create `ux-audit/PHASE_2_SIGNOFF.md` with pass/fail evidence and adapter-extension guidance. Do not sign off with any acceptance failure or active defect.

### Completion gate

- The generic simulation platform is signed off, reproducible, accessible, and ready for game-specific adapter work.
