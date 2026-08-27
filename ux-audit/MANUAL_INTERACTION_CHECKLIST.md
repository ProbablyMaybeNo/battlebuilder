# Phase 1 manual interaction checklist

Recorded 2026-08-26. The checklist was replayed in the isolated Chromium
profile at 1440 × 960 and 1920 × 1080; browser state is isolated through
`e2e/fixtures.ts`. Related automated evidence is named where it is the most
precise repeatable record.

| Area | Check | Outcome |
| --- | --- | --- |
| Board | Empty board, 36 × 36 default, 1-inch grid, 12-inch major lines | Pass |
| Camera | Wheel / +/- zoom, arrow/middle/Shift pan, F reset, view presets | Pass |
| 3D | Isometric/perspective, orbit/pan/zoom, picking, context-loss fallback | Pass |
| Build | Catalog arm, drag footprint, live valid/invalid state, keyboard placement | Pass |
| Selection | Click, Shift select, intersecting marquee, keyboard piece selection, Escape | Pass |
| Transform | Move, direct resize/rotate handles, keyboard movement/rotate, lock/cancel | Pass |
| Structures | Duplicate/delete, compatible join/reasoned rejection, door/window Access | Pass |
| Drawers | Board/Build/Layers/Setup open, search, layer visibility/lock/order, settings | Pass |
| Inspector | Properties, Appearance, Structure, Access, Notes, safe numeric draft input | Pass |
| Lifecycle | New/Rename/Save/Open/Duplicate/Export/Import/Clear and bounded undo/redo | Pass |
| Recovery | Clear/multi-delete confirmation and malformed import keeps active board | Pass |
| Keyboard/focus | Menu, drawer, popover, dialog Escape/restoration; tabs; no mouse core path | Pass |
| Resilience | Pointer cancel/lost capture/blur, touch dispatch, reduced motion, browser zoom | Pass |
| Accessibility | Named SVG/3D pieces, Layers equivalent, non-colour states, live feedback, axe | Pass |

No new unresolved defect was identified. The only review issue during B10 was
an evidence-test selector that addressed the board terrain instead of the
Layers entry; it was corrected by scoping the locator to the open Layers drawer
before evidence was generated. This was a test harness issue, not a product
defect.
