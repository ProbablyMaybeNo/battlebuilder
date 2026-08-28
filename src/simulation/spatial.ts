import type { BattlePosition, SimulationTerrainFact } from './contracts';

/** Grid-only spatial primitives. They deliberately know nothing about a game system. */
export interface GridBounds { width: number; height: number; }
export interface TerrainSpatialPolicy {
  blocksMovement: (terrain: SimulationTerrainFact) => boolean;
  blocksLineOfSight: (terrain: SimulationTerrainFact) => boolean;
  grantsCover: (terrain: SimulationTerrainFact) => boolean;
  /** Lets an adapter give non-structure terrain (such as a wall) a rules height. */
  lineOfSightHeightInches?: (terrain: SimulationTerrainFact) => number;
}
export interface ElevationHook { observerInches: number; targetInches: number; }
export interface GridPathResult { path: readonly BattlePosition[] | null; distance: number; reason: 'ok' | 'out-of-bounds' | 'blocked' | 'too-far'; }
export interface LineOfSightResult { clear: boolean; ray: readonly BattlePosition[]; blockers: readonly SimulationTerrainFact[]; }

const key = ({ x, y }: BattlePosition) => `${x},${y}`;
const equal = (left: BattlePosition, right: BattlePosition) => left.x === right.x && left.y === right.y;

export function inGridBounds(bounds: GridBounds, position: BattlePosition): boolean {
  return Number.isInteger(position.x) && Number.isInteger(position.y) && position.x >= 0 && position.y >= 0 && position.x < bounds.width && position.y < bounds.height;
}

/** Four-way distance is used for paths; diagonal steps never silently shorten movement. */
export function gridMovementDistance(from: BattlePosition, to: BattlePosition): number {
  return Math.abs(to.x - from.x) + Math.abs(to.y - from.y);
}

/** Square-grid range uses the longest axis so diagonal targets count consistently. */
export function gridRangeDistance(from: BattlePosition, to: BattlePosition): number {
  return Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y));
}

export function terrainContains(terrain: SimulationTerrainFact, position: BattlePosition): boolean {
  return position.x >= terrain.x && position.x < terrain.x + terrain.width && position.y >= terrain.y && position.y < terrain.y + terrain.height;
}

export function terrainAt(terrain: readonly SimulationTerrainFact[], position: BattlePosition): readonly SimulationTerrainFact[] {
  return terrain.filter((entry) => terrainContains(entry, position));
}

/**
 * Deterministic supercover ray: each grid square touched between the centres is
 * returned, including corner-touching squares. Callers may exclude endpoints.
 */
export function supercoverRay(from: BattlePosition, to: BattlePosition): readonly BattlePosition[] {
  const cells: BattlePosition[] = [{ ...from }];
  const dx = to.x - from.x; const dy = to.y - from.y;
  const nx = Math.abs(dx); const ny = Math.abs(dy);
  const signX = Math.sign(dx); const signY = Math.sign(dy);
  let x = from.x; let y = from.y; let ix = 0; let iy = 0;
  while (ix < nx || iy < ny) {
    const decision = (1 + 2 * ix) * ny - (1 + 2 * iy) * nx;
    if (decision === 0) { x += signX; y += signY; ix += 1; iy += 1; }
    else if (decision < 0) { x += signX; ix += 1; }
    else { y += signY; iy += 1; }
    cells.push({ x, y });
  }
  return cells;
}

const terrainBlocks = (terrain: readonly SimulationTerrainFact[], policy: TerrainSpatialPolicy, position: BattlePosition) => terrainAt(terrain, position).some(policy.blocksMovement);

/** Breadth-first, four-way pathfinding with stable neighbour order and no ambient state. */
export function findGridPath(bounds: GridBounds, from: BattlePosition, to: BattlePosition, maximumDistance: number, terrain: readonly SimulationTerrainFact[], policy: TerrainSpatialPolicy, occupied: readonly BattlePosition[] = []): GridPathResult {
  if (!inGridBounds(bounds, from) || !inGridBounds(bounds, to)) return { path: null, distance: 0, reason: 'out-of-bounds' };
  if (gridMovementDistance(from, to) > maximumDistance) return { path: null, distance: gridMovementDistance(from, to), reason: 'too-far' };
  const blocked = new Set(occupied.filter((position) => !equal(position, from)).map(key));
  if (blocked.has(key(to)) || terrainBlocks(terrain, policy, to)) return { path: null, distance: 0, reason: 'blocked' };
  const queue: BattlePosition[] = [{ ...from }];
  const previous = new Map<string, BattlePosition | null>([[key(from), null]]);
  const distance = new Map<string, number>([[key(from), 0]]);
  const steps = [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 0, y: -1 }] as const;
  while (queue.length) {
    const current = queue.shift()!;
    if (equal(current, to)) {
      const path: BattlePosition[] = [];
      let cursor: BattlePosition | null = current;
      while (cursor) { path.unshift(cursor); cursor = previous.get(key(cursor)) ?? null; }
      return { path, distance: distance.get(key(current)) ?? 0, reason: 'ok' };
    }
    const currentDistance = distance.get(key(current)) ?? 0;
    if (currentDistance >= maximumDistance) continue;
    for (const step of steps) {
      const next = { x: current.x + step.x, y: current.y + step.y };
      const nextKey = key(next);
      if (!inGridBounds(bounds, next) || previous.has(nextKey) || blocked.has(nextKey) || terrainBlocks(terrain, policy, next)) continue;
      previous.set(nextKey, current); distance.set(nextKey, currentDistance + 1); queue.push(next);
    }
  }
  return { path: null, distance: 0, reason: 'blocked' };
}

const rayHeight = (index: number, lastIndex: number, elevations: ElevationHook) => elevations.observerInches + (elevations.targetInches - elevations.observerInches) * (index / lastIndex);

/** A blocker stops a ray only when its top reaches the interpolated elevation hook. */
export function lineOfSight(from: BattlePosition, to: BattlePosition, terrain: readonly SimulationTerrainFact[], policy: TerrainSpatialPolicy, elevations: ElevationHook = { observerInches: 1, targetInches: 1 }): LineOfSightResult {
  const ray = supercoverRay(from, to);
  const blockers: SimulationTerrainFact[] = [];
  const seen = new Set<string>();
  for (let index = 1; index < ray.length - 1; index += 1) {
    for (const entry of terrainAt(terrain, ray[index])) {
      const height = policy.lineOfSightHeightInches?.(entry) ?? entry.heightInches;
      if (policy.blocksLineOfSight(entry) && entry.elevationInches + height >= rayHeight(index, ray.length - 1, elevations) && !seen.has(entry.sourcePieceId)) {
        seen.add(entry.sourcePieceId); blockers.push(entry);
      }
    }
  }
  return { clear: blockers.length === 0, ray, blockers };
}

/** Cover is sampled from the ray after the attacker; terrain in the target cell can provide cover. */
export function interveningCover(from: BattlePosition, to: BattlePosition, terrain: readonly SimulationTerrainFact[], policy: TerrainSpatialPolicy): readonly SimulationTerrainFact[] {
  const seen = new Set<string>();
  return supercoverRay(from, to).slice(1).flatMap((position) => terrainAt(terrain, position)).filter((entry) => {
    if (!policy.grantsCover(entry) || seen.has(entry.sourcePieceId)) return false;
    seen.add(entry.sourcePieceId); return true;
  });
}
