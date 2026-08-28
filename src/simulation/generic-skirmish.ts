import type { BattleSession, BattleUnit, SimulationTerrainFact } from './contracts';
import { rollRandom } from './prng';
import type { CoverResolution, LegalTarget, LineOfSightResolution, MovementRequest, MovementResolution, ObjectiveRequest, ObjectiveScoreResolution, RangeRequest, RangeResolution, RollRequest, RollResolution, RuleExplanation, RuleResolution, RulesAdapter, SightRequest, TacticalAction, TerrainEffect, TerrainRequest, UnitContext, UnitProfile } from './rules';
import { findGridPath, gridRangeDistance, interveningCover, lineOfSight, terrainAt, type TerrainSpatialPolicy } from './spatial';

export const GENERIC_SKIRMISH_ADAPTER_ID = 'battle-builder-generic';
export const GENERIC_SKIRMISH_ADAPTER_VERSION = '1';
const genericPhases = ['setup', 'deployment', 'command', 'resolution', 'complete'] as const;
const terrainPolicy: TerrainSpatialPolicy = {
  blocksMovement: (terrain) => ['building', 'ruin', 'wall', 'water'].includes(terrain.kind),
  blocksLineOfSight: (terrain) => ['building', 'ruin', 'wall', 'rocks'].includes(terrain.kind),
  grantsCover: (terrain) => ['building', 'ruin', 'wall', 'woods', 'rocks', 'scatter'].includes(terrain.kind),
  lineOfSightHeightInches: (terrain) => terrain.heightInches || (terrain.kind === 'wall' ? 2 : terrain.kind === 'rocks' ? 3 : 0),
};

const profile = (unit: BattleUnit): UnitProfile => {
  const name = unit.name.toLowerCase();
  if (name.includes('scout')) return { id: 'generic-scout', label: 'Scout', movementInches: 8, attackRangeInches: 10, attackTarget: 4, observerElevationInches: 1 };
  if (name.includes('heavy')) return { id: 'generic-heavy', label: 'Heavy', movementInches: 4, attackRangeInches: 18, attackTarget: 5, observerElevationInches: 1 };
  return { id: 'generic-line', label: 'Line', movementInches: 6, attackRangeInches: 12, attackTarget: 4, observerElevationInches: 1 };
};
const explain = (title: string, outcome: RuleExplanation['outcome'], summary: string, inputs: RuleExplanation['inputs'], assumptions: readonly string[], terrain: readonly string[] = [], rolls: RuleExplanation['rolls'] = []): RuleExplanation => ({ title, outcome, summary, inputs, assumptions, terrain, rolls });
const unknown = <T>(title: string, value: T, summary: string): RuleResolution<T> => ({ ok: false, value, explanation: explain(title, 'illegal', summary, [], ['The generic adapter requires a known, deployed unit where applicable.']) });
const unitFor = (session: BattleSession, unitId: string) => session.units.find((unit) => unit.id === unitId);
const canAct = (session: BattleSession, unit: BattleUnit) => session.turn.phase === 'command' && session.turn.activeFactionId === unit.factionId;
const position = (unit: BattleUnit) => unit.position;
const displayTerrain = (entries: readonly SimulationTerrainFact[]) => entries.map((entry) => `${entry.name}: ${entry.kind} at ${entry.x}, ${entry.y}`).sort();
const boardBounds = (session: BattleSession) => ({ width: session.board.snapshot.settings.widthInches, height: session.board.snapshot.settings.heightInches });

function resolveRange(request: RangeRequest): RuleResolution<RangeResolution> {
  const distance = gridRangeDistance(request.from, request.to);
  const value = { from: request.from, to: request.to, distance, maximum: request.maximum, inRange: distance <= request.maximum };
  return { ok: value.inRange, value, explanation: explain('Range check', value.inRange ? 'legal' : 'illegal', value.inRange ? `Target is ${distance} inches away and within ${request.maximum} inches.` : `Target is ${distance} inches away, beyond the ${request.maximum}-inch limit.`, [{ label: 'Origin', value: `${request.from.x}, ${request.from.y}` }, { label: 'Target', value: `${request.to.x}, ${request.to.y}` }, { label: 'Range', value: `${distance} / ${request.maximum} inches` }], ['Weapon range uses Chebyshev distance on the fixed one-inch square grid.']) };
}

function resolveSight(session: BattleSession, observer: BattleUnit, target: BattleUnit, elevations?: { observerInches: number; targetInches: number }): RuleResolution<LineOfSightResolution> {
  const observerPosition = position(observer); const targetPosition = position(target);
  if (!observerPosition || !targetPosition) return unknown('Line of sight', { line: { clear: false, ray: [], blockers: [] } }, 'Both units must be deployed before line of sight can be checked.');
  const line = lineOfSight(observerPosition, targetPosition, session.terrain, terrainPolicy, elevations ?? { observerInches: profile(observer).observerElevationInches, targetInches: profile(target).observerElevationInches });
  const terrain = displayTerrain(line.blockers);
  return { ok: line.clear, value: { line }, explanation: explain('Line of sight', line.clear ? 'legal' : 'illegal', line.clear ? 'No terrain rises into the sight ray.' : `Sight is blocked by ${line.blockers.map((entry) => entry.name).join(', ')}.`, [{ label: 'Observer', value: `${observer.name} at ${observerPosition.x}, ${observerPosition.y}` }, { label: 'Target', value: `${target.name} at ${targetPosition.x}, ${targetPosition.y}` }, { label: 'Ray cells', value: line.ray.map((cell) => `${cell.x},${cell.y}`).join(' → ') }], ['Blocking terrain is compared against the interpolated observer/target elevation hook.', 'Endpoint terrain does not block its own unit.'], terrain) };
}

function resolveCover(session: BattleSession, observer: BattleUnit, target: BattleUnit): RuleResolution<CoverResolution> {
  const observerPosition = position(observer); const targetPosition = position(target);
  if (!observerPosition || !targetPosition) return unknown('Cover check', { covered: false, terrain: [] }, 'Both units must be deployed before cover can be checked.');
  const terrain = interveningCover(observerPosition, targetPosition, session.terrain, terrainPolicy);
  const value = { covered: terrain.length > 0, terrain };
  return { ok: true, value, explanation: explain('Cover check', 'resolved', value.covered ? `${target.name} has cover from ${terrain.map((entry) => entry.name).join(', ')}.` : `${target.name} has no intervening cover.`, [{ label: 'Observer', value: observer.name }, { label: 'Target', value: target.name }], ['Cover is sampled along the supercover ray after the observer; terrain in the target cell may provide cover.'], displayTerrain(terrain)) };
}

function resolveMovement(request: MovementRequest): RuleResolution<MovementResolution> {
  const unit = unitFor(request.session, request.unitId);
  const empty: MovementResolution = { unitId: request.unitId, destination: request.destination, path: { path: null, distance: 0, reason: 'blocked' } };
  const unitPosition = unit ? position(unit) : null;
  if (!unit || !unitPosition) return unknown('Movement check', empty, 'Choose a known deployed unit before planning movement.');
  if (!canAct(request.session, unit)) return { ok: false, value: empty, explanation: explain('Movement check', 'illegal', `${unit.name} cannot move outside its active command phase.`, [{ label: 'Phase', value: request.session.turn.phase }, { label: 'Active faction', value: request.session.turn.activeFactionId ?? 'none' }], ['The generic adapter only allows movement for the active faction during command.']) };
  const path = findGridPath(boardBounds(request.session), unitPosition, request.destination, profile(unit).movementInches, request.session.terrain, terrainPolicy, request.session.units.filter((entry) => entry.id !== unit.id && entry.position).map((entry) => entry.position!));
  const value = { unitId: unit.id, destination: request.destination, path };
  const messages = { ok: `${unit.name} can move ${path.distance} inches.`, 'out-of-bounds': 'Destination is outside the board.', blocked: 'No legal route avoids occupied or blocking terrain.', 'too-far': `Destination exceeds ${profile(unit).movementInches} inches of movement.` };
  return { ok: path.reason === 'ok', value, explanation: explain('Movement check', path.reason === 'ok' ? 'legal' : 'illegal', messages[path.reason], [{ label: 'Unit', value: unit.name }, { label: 'From', value: `${unitPosition.x}, ${unitPosition.y}` }, { label: 'To', value: `${request.destination.x}, ${request.destination.y}` }, { label: 'Movement allowance', value: `${profile(unit).movementInches} inches` }, { label: 'Route distance', value: `${path.distance} inches` }], ['Movement is four-way, one inch per cell, and uses deterministic breadth-first pathfinding.', 'Buildings, ruins, walls, water, and deployed units block movement.'], path.path ? [] : displayTerrain(request.session.terrain.filter(terrainPolicy.blocksMovement))) };
}

function resolveTerrain(request: TerrainRequest): RuleResolution<readonly TerrainEffect[]> {
  const entries = terrainAt(request.session.terrain, request.position);
  const value = entries.map((entry) => ({ terrainId: entry.sourcePieceId, terrainName: entry.name, movementBlocked: terrainPolicy.blocksMovement(entry), lineOfSightBlocked: terrainPolicy.blocksLineOfSight(entry), grantsCover: terrainPolicy.grantsCover(entry), elevationInches: entry.elevationInches, heightInches: entry.heightInches }));
  return { ok: true, value, explanation: explain('Terrain effects', 'resolved', value.length ? `${value.map((entry) => entry.terrainName).join(', ')} affects this cell.` : 'No terrain affects this cell.', [{ label: 'Cell', value: `${request.position.x}, ${request.position.y}` }], ['Terrain effects are the generic adapter’s policy, not fields added to the board document.'], displayTerrain(entries)) };
}

function resolveTargets(context: UnitContext): RuleResolution<readonly LegalTarget[]> {
  const attacker = unitFor(context.session, context.unitId);
  const attackerPosition = attacker ? position(attacker) : null;
  if (!attacker || !attackerPosition) return unknown('Legal targets', [], 'Choose a known deployed attacker first.');
  const targets = context.session.units.filter((target) => target.id !== attacker.id).map((target): LegalTarget => {
    const targetPosition = position(target);
    if (!targetPosition) return { unitId: target.id, legal: false, reason: 'Target is not deployed.', range: null, lineOfSight: null, cover: null };
    if (target.factionId === attacker.factionId) return { unitId: target.id, legal: false, reason: 'Friendly units are not legal generic-skirmish targets.', range: null, lineOfSight: null, cover: null };
    const range = resolveRange({ from: attackerPosition, to: targetPosition, maximum: profile(attacker).attackRangeInches }).value;
    const sight = resolveSight(context.session, attacker, target).value;
    const cover = resolveCover(context.session, attacker, target).value;
    if (!range.inRange) return { unitId: target.id, legal: false, reason: 'Target is out of range.', range, lineOfSight: sight, cover };
    if (!sight.line.clear) return { unitId: target.id, legal: false, reason: 'Target has no line of sight.', range, lineOfSight: sight, cover };
    return { unitId: target.id, legal: true, reason: cover.covered ? 'Target is legal and benefits from cover.' : 'Target is legal.', range, lineOfSight: sight, cover };
  });
  return { ok: true, value: targets, explanation: explain('Legal targets', 'resolved', `${targets.filter((target) => target.legal).length} legal target${targets.filter((target) => target.legal).length === 1 ? '' : 's'} found.`, [{ label: 'Attacker', value: attacker.name }, { label: 'Attack range', value: `${profile(attacker).attackRangeInches} inches` }], ['Targets must be deployed enemies in range with clear line of sight.'], targets.flatMap((target) => target.lineOfSight?.line.blockers ?? []).map((entry) => `${entry.name} blocks a candidate target.`)) };
}

function resolveObjective(request: ObjectiveRequest): RuleResolution<ObjectiveScoreResolution> {
  const empty: ObjectiveScoreResolution = { objectiveId: request.objectiveId, factionId: request.factionId, points: 0, controlled: false };
  const objective = request.session.objectives.find((entry) => entry.id === request.objectiveId);
  if (!objective || !request.session.factions.some((entry) => entry.id === request.factionId)) return unknown('Objective score', empty, 'Choose a known objective and faction.');
  const anchor = objective.sourcePieceId ? request.session.terrain.find((entry) => entry.sourcePieceId === objective.sourcePieceId) : undefined;
  if (!anchor) return { ok: false, value: empty, explanation: explain('Objective score', 'illegal', 'This objective has no board terrain anchor.', [{ label: 'Objective', value: objective.id }], ['The generic adapter scores only board-anchored objectives.']) };
  const friendly = request.session.units.some((unit) => unit.factionId === request.factionId && unit.position && terrainAt([anchor], unit.position).length > 0);
  const enemy = request.session.units.some((unit) => unit.factionId !== request.factionId && unit.position && terrainAt([anchor], unit.position).length > 0);
  const value = { objectiveId: objective.id, factionId: request.factionId, points: friendly && !enemy ? 1 : 0, controlled: friendly && !enemy };
  return { ok: true, value, explanation: explain('Objective score', 'resolved', value.controlled ? 'A friendly unit controls this objective for 1 point.' : enemy ? 'Objective is contested and scores 0 points.' : 'No friendly unit controls this objective.', [{ label: 'Objective', value: anchor.name }, { label: 'Faction', value: request.session.factions.find((entry) => entry.id === request.factionId)?.name ?? request.factionId }, { label: 'Points', value: String(value.points) }], ['A deployed unit controls an objective by occupying its source terrain footprint; enemy occupation contests it.'], displayTerrain([anchor])) };
}

export const genericSkirmishAdapter: RulesAdapter = {
  id: GENERIC_SKIRMISH_ADAPTER_ID,
  version: GENERIC_SKIRMISH_ADAPTER_VERSION,
  label: 'Battle Builder generic skirmish',
  description: 'An original, deliberately small reference rules adapter for deterministic integration tests. It is not a licensed or third-party game ruleset.',
  phases: () => genericPhases,
  profileFor: (unit) => profile(unit),
  legalActions: (context) => {
    const unit = unitFor(context.session, context.unitId);
    if (!unit || !position(unit)) return unknown('Legal actions', [], 'Choose a known deployed unit first.');
    const actions: TacticalAction[] = canAct(context.session, unit) ? ['move', 'attack', 'secure-objective'] : [];
    return { ok: true, value: actions, explanation: explain('Legal actions', 'resolved', actions.length ? `${unit.name} may ${actions.join(', ')}.` : `${unit.name} has no legal action in this phase.`, [{ label: 'Unit', value: unit.name }, { label: 'Phase', value: context.session.turn.phase }, { label: 'Active faction', value: context.session.turn.activeFactionId ?? 'none' }], ['The generic adapter grants actions only to a deployed unit in its faction’s command phase.']) };
  },
  movement: resolveMovement,
  range: resolveRange,
  terrainEffects: resolveTerrain,
  cover: (request: SightRequest) => {
    const observer = unitFor(request.session, request.observerId); const target = unitFor(request.session, request.targetId);
    if (!observer || !target) return unknown('Cover check', { covered: false, terrain: [] }, 'Choose known observer and target units.');
    return resolveCover(request.session, observer, target);
  },
  lineOfSight: (request: SightRequest) => {
    const observer = unitFor(request.session, request.observerId); const target = unitFor(request.session, request.targetId);
    if (!observer || !target) return unknown('Line of sight', { line: { clear: false, ray: [], blockers: [] } }, 'Choose known observer and target units.');
    return resolveSight(request.session, observer, target, request.elevations);
  },
  legalTargets: resolveTargets,
  objectiveScoring: resolveObjective,
  resolveRoll: (request: RollRequest) => {
    const roll = rollRandom(request.random, request.minimum, request.maximum);
    const value: RollResolution = { random: roll.random, result: roll.result, success: roll.result >= request.target, target: request.target };
    return { ok: true, value, explanation: explain('Deterministic roll', 'resolved', value.success ? `${request.label} succeeds with ${value.result} against ${request.target}.` : `${request.label} fails with ${value.result} against ${request.target}.`, [{ label: 'Roll', value: request.label }, { label: 'Random algorithm', value: request.random.algorithm }, { label: 'Bounds', value: `${request.minimum}–${request.maximum}` }, { label: 'Target', value: String(request.target) }], ['The supplied serializable PRNG state is advanced exactly once; no clock or ambient randomness is read.'], [], [{ label: request.label, minimum: request.minimum, maximum: request.maximum, result: value.result, target: request.target }]) };
  },
};

/** Adapter lookup is explicit and versioned so future systems do not alter engine internals. */
export function resolveRulesAdapter(id: string, version: string): RulesAdapter | null {
  return id === genericSkirmishAdapter.id && version === genericSkirmishAdapter.version ? genericSkirmishAdapter : null;
}
