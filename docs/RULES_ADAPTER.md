# Rules adapters

Battle Builder’s simulation engine owns session state, event sequencing, and
the serializable deterministic random source. A rules adapter owns tactical
meaning: which actions are legal, how far a unit may move or attack, terrain
effects, cover, line of sight, objectives, and roll outcomes. This boundary
keeps `BoardDocument` and the generic engine independent of any game system.

The public TypeScript contract is [`src/simulation/rules.ts`](../src/simulation/rules.ts).
Every method returns a `RuleResolution<T>` with a `RuleExplanation`; it never
returns an unexplained boolean or calculated value. Explanations carry:

- named inputs;
- stated assumptions;
- terrain contributions;
- deterministic roll bounds/results when a roll occurred; and
- a legal, illegal, or resolved outcome plus a short human-readable summary.

## Spatial conventions

[`src/simulation/spatial.ts`](../src/simulation/spatial.ts) is pure and
renderer-independent. All coordinates are fixed one-inch board cells.

- Movement uses four-way Manhattan distance and deterministic breadth-first
  pathfinding. The returned path is stable for identical inputs.
- Weapon range uses Chebyshev distance, so a diagonal measures by its longest
  axis on the square grid.
- Sight and cover use a deterministic supercover ray. LOS excludes each
  endpoint as a blocker; cover starts after the observer and can include the
  target cell.
- LOS accepts observer/target elevation hooks. An adapter can supply a
  rules-defined height for non-structure terrain such as walls.

## Reference adapter

[`src/simulation/generic-skirmish.ts`](../src/simulation/generic-skirmish.ts)
provides `battle-builder-generic@1`. It is an original, intentionally small
reference profile for integration tests and product development. It is **not**
a licensed, compatible, or implied third-party ruleset.

It defines Scout, Line, and Heavy profiles by generic unit name, command-phase
actions, four-way movement, fixed-grid range, terrain effects, cover, LOS,
board-anchored objective scoring, and seeded bounded rolls. Its terrain policy
is explicit: buildings, ruins, walls, and water block movement; buildings,
ruins, walls, and rocks block LOS; and buildings, ruins, walls, woods, rocks,
and scatter provide cover. B16 will present these results, but it must use the
adapter-produced `RuleExplanation` rather than calculate or paraphrase rules
independently.

## Adding an adapter

1. Implement every `RulesAdapter` method with pure deterministic logic and
   full `RuleExplanation` values.
2. Give the adapter a stable ID and version, then register it through an
   explicit resolver. Do not switch behavior silently under an existing
   version.
3. Consume only `BattleSession`, its immutable terrain facts, and supplied
   serializable PRNG state. Never add game-specific fields to `BoardDocument`
   or call `Date`, `Math.random`, browser state, or renderer APIs.
4. Test blocked movement, range, cover, LOS/elevation, objectives, invalid
   inputs, and deterministic seeded rolls before exposing the adapter in UI.
