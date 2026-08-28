# Battle Builder

Battle Builder is a desktop-first tactical board planner. It provides a
renderer-neutral board document, a precise overhead editor, and a real
interactive 3D planning view. It deliberately does **not** contain game rules,
units, combat, turns, dice, line-of-sight calculations, or simulation; those
belong to Phase 2 after the Phase 1 readiness gate.

Phase 1 is signed off through B12 and is ready to serve as the spatial
foundation for a separately planned simulator. The acceptance record is in
[`ux-audit/PHASE_1_SIGNOFF.md`](ux-audit/PHASE_1_SIGNOFF.md).

New boards are 36 × 36 inches. Every cell is permanently one inch, with a
visible line at every inch and a stronger reference line at each 12-inch
multiple. Boards can be configured from 12 × 12 up to 72 × 72 inches.

## Local setup

Use Node.js 24 (24.6.0 is recorded in [`.node-version`](.node-version)) and
pnpm 11.19.0, as pinned in `package.json`.

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Open the local URL printed by Vite. To inspect the production build instead:

```sh
pnpm build
pnpm preview
```

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Run the Vite development server. |
| `pnpm build` | Strict type-check and create the production bundle. |
| `pnpm preview` | Serve the already-built production bundle locally. |
| `pnpm lint` | Run ESLint with zero warnings allowed. |
| `pnpm typecheck` | Run the strict TypeScript project check. |
| `pnpm test` | Run Vitest unit and integration tests. |
| `pnpm test:e2e` | Run isolated Playwright browser and axe coverage. |
| `pnpm audit` | Audit production dependencies at high severity or above. |
| `pnpm bundle:check` | Verify the initial route and lazy 3D chunk budgets after a build. |
| `pnpm release:hygiene` | Check the production dependency allowlist, lazy Three.js boundary, and no-remote-font policy. |

Playwright uses a fresh browser context for every test. Any browser test that
touches storage must import `test` from [`e2e/fixtures.ts`](e2e/fixtures.ts);
the fixture rewrites the normal user-draft key to `battle-builder/e2e/v1/`.
Never run tests against a personal browser profile.

## Board documents and storage

Battle Builder exports and imports JSON documents using schema version 1. The
document contains board settings, terrain pieces, structures, footprints,
doors, windows, display state, and notes. Imports are runtime-validated before
they replace the current board; malformed, unsupported, out-of-bounds, or
duplicate-ID documents are rejected while the active board remains intact.

The current browser draft is stored under `battle-builder/v1/draft`; manually
saved boards have a separate local index. This storage is local to the browser,
so JSON export is the portable backup/share format. Version 1 compatibility is
maintained through the document migration registry; future formats must migrate
before validation rather than relying on renderer-specific fields.

## Controls

| Action | Overhead editor | 3D planning view |
| --- | --- | --- |
| Select / move | Left-click or drag in Select mode | Left-click / drag in Select mode |
| Construct | Drag from the first snapped cell to the intended opposite cell | Use the top build plane; use overhead for final precision |
| Pan | Middle drag, Shift + left drag, or arrow keys | Middle drag, Shift + left drag, or arrow keys |
| Orbit | — | Right drag or Alt + left drag |
| Zoom | Wheel, `+`, or `-` | Wheel, `+`, or `-` |
| Fit/reset | `F` | `F` |
| View presets | `1` returns overhead | `1` overhead, `2` isometric, `3` perspective, `4` front-side |
| Piece editing | `H`/`J`/`K`/`L` move, `R` rotate, Ctrl/Cmd+D duplicate, Delete remove | Select a piece, then use the inspector or overhead handles |

The in-product **Controls** and **Help** surfaces provide the same quick
reference. A lost WebGL context shows a clear recovery message and a safe
return to the overhead editor; board data remains unchanged.

## Accessibility and browser support

The workspace uses landmarks, labelled controls, keyboard-operable drawers,
menus, dialogs, tabs, terrain alternatives, focus restoration, live status
messages, visible non-colour selection/lock/focus states, and reduced-motion
support. Precise pointer operations have keyboard and inspector equivalents.

The planner targets current desktop Chrome, Edge, Firefox, and Safari with
JavaScript, SVG, local storage, and WebGL enabled. Automated browser coverage
currently runs in Chromium. The overhead editor remains available when WebGL is
unavailable or its graphics context is lost. Mobile layout is usable but is not
a Phase 1 design target.

## Reference material, contribution, and license

[`Design Cyberpunk 3D Planner/`](Design%20Cyberpunk%203D%20Planner/) and
[`Battle Builder Inspo/`](Battle%20Builder%20Inspo/) are user-owned local
references only. Their code, assets, imagery, and fonts are excluded from Git,
linting, TypeScript, the bundle, and shipped artifacts. Battle Builder uses
local/system typography and no remote font or visual-asset dependency.

Read [`AGENTS.md`](AGENTS.md) and the active batch in
[`ux-audit/JOB_BATCHES.md`](ux-audit/JOB_BATCHES.md) before changing the
project. Work one batch at a time, record every finding in
[`ux-audit/BACKLOG.md`](ux-audit/BACKLOG.md), and do not start Phase 2 without
the B12 evidence gate. Screenshot requirements are in
[`ux-audit/SCREENSHOT_CONVENTION.md`](ux-audit/SCREENSHOT_CONVENTION.md).

All rights reserved. This repository does not grant a public license to use,
copy, modify, or distribute the source or product assets.
