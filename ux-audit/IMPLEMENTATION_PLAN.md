# Battle Builder — implementation & delivery plan

## Product definition

Battle Builder is a desktop-first tactical board planner. Its Phase 1 job is to create, inspect, arrange, save, and share tactical boards. It is not a combat simulator, army builder, generic dashboard, or 3D engine. The board must feel like a polished command workspace: precise, calm, quick to learn, and capable enough to become the shared spatial foundation for a later simulation layer.

| Phase | Included | Explicitly deferred |
| --- | --- | --- |
| 0 — Foundation | Environment, architecture, visual system, test pipeline, delivery process | Product features beyond bootstrapping |
| 1 — Board planner | Board documents, precise overhead editor, real 3D planning view, terrain placement, selection, transforms, layers, settings, persistence, import/export, accessibility | Units, factions, deployment, turns, dice, ranges, combat, rules calculations |
| 2 — Simulator | Rules adapters, units, deterministic state/roll engine, movement, terrain effects, LOS, logs, replay | Any rewrite of the board planner model |

## Reference interpretation and visual direction

The supplied Cyberpunk Planner is the foundation for Battle Builder’s theme and baseline UI: its near-black/navy command surfaces, cyan technical framing, restrained violet accents, compact HUD controls, grid presentation, and 3D command-board language are the starting point. Battle Builder will retain and refine those useful foundations while replacing its prototype-shaped WebGL, always-present panels, generic box geometry, duplicated controls, and fragile interaction logic with a production planner architecture. The supplied code, screenshots, fonts, and assets are reference material only: no third-party imagery or watermarked assets will be imported.

- The tactical board is visually dominant. Chrome supports it rather than competing with it.
- Cyan/teal communicates normal active state; violet is secondary; amber/coral/red is only for invalid, destructive, or warning conditions.
- Use subtle framing and almost no perpetual glow. Avoid decorative scanline noise, giant markers, or debug-HUD density.
- Use local/system typography: a readable UI sans with a system monospace fallback for measurements and technical labels.
- Treat objects as tactical cartography: strong footprint grammar and quiet labels, rather than translucent generic rectangles.
- Support `prefers-reduced-motion`, keyboard focus, and practical contrast from the beginning.

## Information architecture

### Persistent workspace

1. **Top document bar (48–56 px):** Battle Builder identity; editable board/project name; save state; compact undo/redo; one Board menu containing New, Open, Duplicate, Import, Export, Clear, Settings, and Help.
2. **Activity rail (56–72 px):** Board, Build, Layers, and Setup. Each opens an on-demand drawer; the rail never expands into a blank permanent sidebar.
3. **Canvas control shelf:** Active Select/Build state, snap, fit/reset, zoom, and selection context. One compact cluster only.
4. **Main board viewport:** a view switcher presents a precise SVG overhead board and a real 3D planning view, both rendering the same board document, selection, and object geometry.
5. **Selection inspector (320–380 px):** Fully absent with no selection; full drawer/overlay when selected, with horizontal keyboard-accessible tabs.

### On-demand drawers

- **Board:** board summary, save/open controls, quick help.
- **Build:** searchable grouped object library; favourites and recent items; placement instructions.
- **Layers:** searchable pieces list, selection, ordering, visibility, locking, object discovery.
- **Setup:** board dimensions, orientation, surface, snap, and display preferences. The 1-inch grid is fixed and always visible.

## Document and persistence architecture

### Board document v1

```ts
BoardDocument {
  version, id, name, updatedAt,
  settings: { widthInches, heightInches, orientation, surface, snap },
  pieces: Piece[]
}

Piece {
  id, kind, name, x, y, width, height, rotation,
  locked, hidden, layer, notes, structureDetails?
}

StructureDetails {
  footprintCells, doors[], windows[], roofMode
}
```

### Integrity and recovery

- Runtime-validate every imported document before it can replace the active board.
- Reject malformed JSON, unsupported versions/types, invalid settings, duplicate IDs, non-finite values, invalid dimensions, malformed footprints, and attachments outside their parent structure.
- Preserve the active board on every import failure, show a plain-language recovery message, and offer example format/help.
- Add a migration registry now; future document versions must migrate through it before parsing.
- Persist only a user-scoped local draft (`battle-builder/v1/draft`). Tests use an isolated storage context and never touch that namespace.
- Support New, Rename, Duplicate, local Save/Restore, JSON Export, JSON Import, and Clear Board.
- Use editable number controls that retain temporary blank/partial input while typing; validate and normalize only on commit.
- **36×36 inches is the standard board** for every new board, starter layout, screenshot fixture, and first-run zero state. Setup can create rectangular boards from 12×12 up to 72×72 inches, but neither axis may exceed 72 inches (6 feet). The cell size is not configurable: one board cell always equals one inch.

## State, history, and selection architecture

- Implement immutable document mutations through a single command/history layer.
- Every visible mutation is undoable/redoable: add, move, resize, rotate, rename, inspector edits, settings, reorder, show/hide, lock/unlock, duplicate, delete, clear, join, import, and starter layout.
- Support Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z plus compact top-bar controls.
- Clear and multi-delete require confirmation and remain undoable.
- Keep selection predictable after transforms, duplicate, delete, undo, redo, import recovery, and join.
- Use stable IDs, ordered selection, and capped history snapshots to protect memory.

## Tactical board renderer

### Shared board model

- The document model is renderer-neutral. Both the overhead and 3D views consume the exact same pieces, transforms, layers, selection, and validation state.
- A geometry service turns each terrain definition into both a 2D tactical footprint and a 3D mesh specification; there is no parallel “3D-only” board state.
- Edit commands originate in the overhead view for maximum precision. Selection, hover, object visibility, locks, labels, and inspector edits synchronize immediately in 3D.

### Overhead editor and camera

- Primary precision editor: lightweight SVG, with all placement, marquee, direct resize, rotation, snapping, collision, and keyboard editing controls.
- Responsive board fit, smooth pan, wheel zoom, zoom controls, reset/fit, and documented keyboard shortcuts.
- The 1-inch grid is permanently visible in both editing views. Board dimensions are represented one-to-one as grid cells, up to 72×72.
- Draw a stronger major line on each 12-inch multiple—12, 24, 36, 48, 60, and 72—on both axes. Board edges are separately framed and labelled, never confused with a grid multiple.
- Intentional grid hierarchy: 1-inch lines, 12-inch major lines, axis labels, board corners, ruler ticks, scale indicator, and cursor coordinate feedback.
- Surface variants: midnight, concrete, and sand, all preserving grid contrast and readability.

### Real 3D planning view

- Use a dedicated WebGL renderer (Three.js) for a real, interactive 3D board—not an isometric image, fake extrusion, or inactive placeholder.
- Offer useful top-down, isometric, perspective, and front-side camera presets, plus orbit, pan, zoom, reset/fit, and a clearly named “3D planning” view state.
- 3D objects use tactical materials and readable elevation: building walls/roofs/interiors, raised platforms, linear roads/water/walls, woods/rocks/scatter, and compact objective/marker meshes.
- Permit object selection and inspection in 3D. Fine placement remains available in overhead mode; switching views preserves camera intent and selection.
- Add only active, production-used Three.js modules, lazy-load the 3D renderer when its view opens, and enforce a separate 3D chunk budget so the overhead route remains fast.
- Support reduced motion and ordinary desktop hardware: modest lighting, limited shadows, instanced/reused terrain primitives where appropriate, and graceful context-loss recovery.

### Camera and input contract

The control shelf always displays the active view and a compact “Controls” help popover. Bindings are deliberate so board manipulation and camera manipulation never conflict:

| Action | Overhead editor | 3D planning view |
| --- | --- | --- |
| Select / drag selected piece | Left click / drag | Left click / drag when Select mode is active |
| Build a footprint | Left-drag from first snapped cell and release at the desired opposite cell | Same drag gesture in top/orthographic build plane; final precision remains available in overhead |
| Pan camera | Middle drag, Space + left drag, or arrow keys | Middle drag, Space + left drag, or arrow keys |
| Orbit camera | N/A — overhead stays orthographic | Right drag or Alt + left drag |
| Zoom | Wheel, `+` / `-` | Wheel, `+` / `-` |
| Fit / reset | `F` | `F` |
| View presets | `1` overhead | `1` overhead, `2` isometric, `3` perspective, `4` front-side |

Context menus are disabled only inside the interactive board where right-drag is used for orbit; keyboard-only controls offer equivalent camera actions. All camera controls receive accessible buttons and announced preset names.

### Object catalog

- Structures: buildings, ruins, platforms.
- Linear terrain: roads, water, walls.
- Natural terrain: woods, rocks, scatter.
- Tactical items: objectives, tokens, markers.

### Cartographic geometry system

- **Buildings:** footprint, inset wall, door/window/access marks, direction mark, interior/roof treatment.
- **Ruins:** broken perimeter and exposed/interior treatment.
- **Roads:** restrained road edges/lanes with no neon dominance.
- **Water:** clear wave/cross-hatch language that remains readable below objects.
- **Walls:** crenellation/barrier grammar with a thin footprint.
- **Woods, rocks, scatter:** repeatable but restrained symbol patterns.
- **Objectives and markers:** compact, high-legibility symbols with meaningful generated names.
- Objects use data-driven geometry and bounded label placement. Unselected labels remain quiet; rich measurements/callouts appear on hover or selection.

### Interaction behavior

- Neutral default state on new boards; explicit Select and Build modes.
- The zero-state “Build / Add terrain” CTA opens Build, selects a structural item, and immediately arms the placement flow.
- Drag-to-create is a first-class construction pattern: with a structure tool selected, pointer-down establishes a snapped starting cell, drag previews a valid/invalid tactical footprint and live inch dimensions, and release creates exactly that sized structure as one undoable operation. Minimum dimensions are enforced visibly without corrupting the draft gesture.
- Click select, Shift-click multi-select, keyboard selection, Escape deselect.
- Pointer-capture drag with snap, off-board, collision/overlap, alignment-guide, locked, hidden, and invalid-placement feedback.
- Marquee uses documented intersecting-object semantics.
- Direct SVG resize/rotate handles: visible only when appropriate, adequately sized, labelled, keyboard operable, with tooltips.
- Inspector offers equivalent numeric resize/rotate controls and preserves partial/temporary numeric entry safely.
- Keyboard movement, rotation, delete, duplicate, undo, redo, and selection changes with live announcements.
- Handle pointer cancel, lost capture, Escape, and window blur safely without committing unintended movement.
- Join only compatible contiguous structures. Select two or more unlocked structures of a compatible type, invoke Join, and calculate a single union footprint only when they share an edge and their combined outline remains valid. The resulting structure retains accessible attachments and a deterministic generated name; unavailable joins explain whether the issue is type, lock, gap, overlap, rotation, or invalid outline. The operation is fully undoable and preserves selection ordering.
- Buildings and ruins include an **Access** editing mode in the inspector and direct board handles. Users can add, move, resize, and remove doors and windows on valid exterior walls. Door/window attachments snap to the one-inch wall grid, render in both overhead and 3D, move with their parent structure, and are validated after resize, rotate, drag, join, import, and undo/redo.

## Workspace UI and accessibility

- Semantic landmarks, labelled controls, visible authored selection brackets, and no reliance on browser SVG focus outlines.
- Every SVG piece is focusable, named, and also available in the Layers/Pieces list.
- Dialogs, menus, drawers, tabs, and popovers manage focus: trap where modal, Escape close, return focus to launcher, and use appropriate ARIA roles/labels.
- Inspector tabs are horizontal, distinct, keyboard navigable, and never crowded.
- A live region announces selection, movement, deletion, import results, validation feedback, and save state without noisy cursor announcements.
- No drawer, inspector, or overlay may clip into a sliver, cover critical controls, or intercept unrelated board input.
- Desktop polish targets 1440×960 and 1920×1080; narrower layouts remain structurally usable but are not a Phase 1 mobile-design target.

## Implementation modules

```text
src/
  document/       schema, parser, migrations, persistence, history
  model/          catalog, geometry, collision, structure-footprint union, doors/windows, selection commands
  renderer/       SVG board, 3D board, shared symbols/materials, labels, handles, guides
  interactions/   pointer state machine, keyboard shortcuts, overhead/3D camera controls
  workspace/      app shell, top bar, drawers, inspector, dialogs, styles
  tests/          unit and integration tests
e2e/              isolated browser + axe flows and screenshot specs
scripts/          bundle budget and audit helpers
ux-audit/         review screenshots, checklists, findings, backlog
```

Styles remain scoped to the workspace. No remote fonts and no third-party visual assets are needed for Phase 1.

## Quality, test, and review pipeline

### Automated checks

- Pinned Node/dependency versions and committed lockfile.
- Strict TypeScript and ESLint.
- Unit tests: schema parsing/migrations, history, collision, snapping, one-inch/72-inch board limits, 12-inch major-grid calculation, structure union, doors/windows, and naming.
- Integration tests: menu flow, drawer/inspector behavior, board mutations, import recovery, and persistence boundaries.
- Playwright: self-starting development server, isolated local storage, drag-to-size construction, keyboard/pointer/camera flow, dialogs, import/export, undo/redo, join/access editing, and cancellation handling.
- axe checks for workspace, drawers, inspector, dialogs, and error state.
- Production build, production dependency audit, and a bundle-size budget on the initial route.

### Visual review

Capture and store under `ux-audit/` at **1440×960** and **1920×1080**:

1. Empty board / zero state
2. Starter populated board
3. Starter board in isometric 3D planning view
4. Starter board in perspective 3D planning view
5. Build drawer
6. Setup drawer
7. Layers drawer
8. Selected inspector
9. Invalid placement / collision feedback
10. Import error recovery

Manual sign-off covers mouse, keyboard, pointer cancellation, direct resize/rotate, multi-select/marquee, save/restore, import/export, destructive recovery, menus, drawers, dialogs, focus restoration, and both target desktop resolutions.

## Delivery sequence and backlog

### Phase 0 — Environment and delivery setup

- [x] Create a separate Battle Builder project surface; do not use C: or previous Wargame Wizard folders.
- [x] Inspect only supplied reference materials and write the initial architecture plan.
- [x] Set Node, TypeScript, Vite, lint, test, E2E, audit, and bundle scripts.
- [x] Initialize the repository, point `origin` to `https://github.com/ProbablyMaybeNo/battlebuilder.git`, verify access, make an initial commit, and push when GitHub authentication is available.
- [x] Commit pinned lockfile, README, contributor workflow, and license decision.

### Phase 1A — Foundation and document safety

- [x] Define v1 document schema, catalog, local draft namespace, import parser, and history base.
- [x] Add migration registry, local save/open board library, and durable persistence recovery contract. Field-level numeric draft-state UI is deferred to B07, where number inputs are built.
- [x] Add schema, migration, persistence, constraint, and test-storage safeguards. History-base tests remain with lifecycle completion in B08.

### Phase 1B — Board-first workspace and visual system

- [ ] Implement the app shell, slim document bar, 64 px activity rail, compact canvas shelf, SVG board, rulers, grid, surface variants, and zero state.
- [ ] Implement the immutable one-inch board grid (maximum 72×72 cells), major 12-inch lines, dimensions/rulers, and canvas coordinate feedback in both views.
- [ ] Implement the renderer-neutral geometry service, view switching, lazy 3D planning renderer, documented camera bindings, camera presets/orbit/pan/zoom, and overhead/3D selection synchronization.
- [ ] Implement data-driven tactical object symbols, quiet collision-aware labels, hover/selection/invalid/locked/hidden states.
- [ ] Validate visual direction against supplied references without copied visuals/assets.

### Phase 1C — Planner interactions

- [ ] Implement drag-to-size construction, placement, selection, multi-select, marquee, pointer-safe drag, snap, collision, bounds, alignment, keyboard movement, direct resize, rotation, duplication, deletion, and structure join.
- [ ] Implement structure footprints, exterior-wall validation, doors/windows, direct Access editing, and 3D equivalents.
- [ ] Implement pan/zoom/fit/reset and all defined feedback states.
- [ ] Add activity drawers, searchable grouped library, recents/favourites, layers reorder/visibility/locking/search, and type-aware inspector.

### Phase 1D — Lifecycle and accessibility completion

- [ ] Complete Board menu, board naming, new/duplicate/open/clear/import/export, confirmation dialogs, save status, undo/redo coverage, and focus/live-announcement behavior.
- [ ] Test all keyboard, pointer, dialog, and recovery flows manually and automatically.

### Phase 1E — Verification and sign-off

- [ ] Add browser/axe specs and all required visual screenshot captures.
- [ ] Add 3D interaction/performance tests and visual captures for isometric and perspective planning views.
- [ ] Run lint, typecheck, unit/integration/E2E/axe, production build, audit, and bundle check.
- [ ] Fix every discovered issue, record it in `ux-audit/BACKLOG.md`, complete it, and record resolution.
- [ ] Conduct final desktop visual review at both required resolutions. Phase 1 cannot be marked complete until this sign-off is recorded.

### Phase 2 — Tactical simulator (gated)

Do not begin until Phase 1E passes.

- [ ] Define battle/session documents separate from board documents.
- [ ] Add factions, deployable units, deployment state, objectives, turn/phase sequence, and battle mode isolated from Build mode.
- [ ] Create game-system adapters for terrain effects, movement, range, cover, LOS, and future game-specific rules.
- [ ] Implement deterministic seeded dice/rolls, transparent calculation explanations, roll history, and replay.
- [ ] Add event log, accessible result summaries, simulation tests, and replay snapshots.

## Definition of Phase 1 done

Phase 1 is done only when the board planner is visually calm, polished, board-dominant, and fully usable at both desktop review sizes in both overhead and 3D planning modes; the two views accurately share document data and selection; no panels clip or persist uselessly; no labels overlap or use debug-style primitives; all required document, terrain, interaction, keyboard, accessibility, persistence, import/export, history, and recovery paths are implemented; automated checks pass using isolated storage; the required screenshots exist; manual interaction review is recorded; and every discovered backlog item is completed and logged.
