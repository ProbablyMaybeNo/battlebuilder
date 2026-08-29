# Board planner UX/UI progress

## Completed — B19: precision and clarity pass

Acceptance criteria:

- Pointer-to-cell conversion remains exact when the square board is centred in a non-square viewport.
- Select is the default; clicking empty board clears selection and closes the contextual inspector.
- The tool shelf contains Select and Build (plus contextual Access), not Neutral.
- Build contains one searchable Structures & terrain library without duplicate Favorites/Recent/group sections.
- Generic terrain labels are plain-language; structures read neon cyan and woods neon green in both renderers.

## Deferred next priority — B20: structure interiors and semantic properties

- Add versioned internal-wall/room, interior door/window, story, cover, and interactive-marker data.
- Provide a focused interior-editing flow and render it faithfully in overhead and 3D.

Deferred at the user's request: it is an important next capability, but is not
needed in the immediate usability pass.
