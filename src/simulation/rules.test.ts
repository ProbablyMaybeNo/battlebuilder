import { describe, expect, it } from 'vitest';
import { createStructureDetails, newBoard, parseBoard, type BoardDocument, type Piece } from '../document/schema';
import type { BattleSession, SessionCreateCommand, SimulationTerrainFact } from './contracts';
import { GENERIC_SKIRMISH_ADAPTER_ID, GENERIC_SKIRMISH_ADAPTER_VERSION, genericSkirmishAdapter, resolveRulesAdapter } from './generic-skirmish';
import { createRandomState } from './prng';
import { initialBattleSession } from './session';
import { findGridPath, gridMovementDistance, gridRangeDistance, lineOfSight, supercoverRay, type TerrainSpatialPolicy } from './spatial';

const at = '2026-08-28T16:00:00.000Z';
const piece = (id: string, kind: Piece['kind'], x: number, y: number, width = 1, height = 1, extra: Partial<Piece> = {}): Piece => ({ id, kind, name: id, x, y, width, height, rotation: 0, locked: false, hidden: false, layer: 0, notes: '', ...(kind === 'building' || kind === 'ruin' || kind === 'platform' ? { structureDetails: createStructureDetails(width, height) } : {}), ...extra });
const terrain = (entry: Piece, elevationInches = 0, heightInches = 0): SimulationTerrainFact => ({ sourcePieceId: entry.id, kind: entry.kind, name: entry.name, x: entry.x, y: entry.y, width: entry.width, height: entry.height, rotation: entry.rotation, elevationInches, heightInches, access: [] });
const board = (pieces: readonly Piece[] = []): BoardDocument => parseBoard({ ...newBoard({ now: () => new Date(at), idFactory: () => 'board' }), pieces });
const command = (source = board()): SessionCreateCommand => ({
  type: 'session.create', id: 'create', at, sessionId: 'session', name: 'Rules test', board: source, seed: 'rules-seed', adapter: { id: GENERIC_SKIRMISH_ADAPTER_ID, version: GENERIC_SKIRMISH_ADAPTER_VERSION },
  factions: [{ id: 'red', name: 'Red' }, { id: 'blue', name: 'Blue' }],
  units: [{ id: 'red-line', factionId: 'red', name: 'Line team', position: { x: 0, y: 0 } }, { id: 'blue-line', factionId: 'blue', name: 'Line team', position: { x: 6, y: 0 } }, { id: 'red-scout', factionId: 'red', name: 'Scout team', position: null }],
  objectives: source.pieces.filter((entry) => entry.kind === 'objective').map((entry) => ({ id: `objective-${entry.id}`, sourcePieceId: entry.id, state: 'unclaimed' })),
});
const session = (pieces: readonly Piece[] = [], phase: BattleSession['turn']['phase'] = 'command'): BattleSession => ({ ...initialBattleSession(command(board(pieces))), turn: { round: 1, phase, activeFactionId: phase === 'command' ? 'red' : null, moveIntent: null } });

describe('rules adapter contract', () => {
  it('provides a named, versioned original generic adapter covering every B15 calculation', () => {
    expect(resolveRulesAdapter(GENERIC_SKIRMISH_ADAPTER_ID, GENERIC_SKIRMISH_ADAPTER_VERSION)).toBe(genericSkirmishAdapter);
    expect(resolveRulesAdapter('unknown', '1')).toBeNull();
    expect(genericSkirmishAdapter.description).toMatch(/not a licensed or third-party/i);
    expect(genericSkirmishAdapter.phases()).toEqual(['setup', 'deployment', 'command', 'resolution', 'complete']);
    expect(genericSkirmishAdapter.profileFor(command().units[0], session())).toMatchObject({ id: 'generic-line', movementInches: 6, attackRangeInches: 12 });
    expect(genericSkirmishAdapter.profileFor({ ...command().units[0], name: 'Heavy team' }, session())).toMatchObject({ id: 'generic-heavy', attackRangeInches: 18 });
  });

  it('returns adapter-owned explanations for legal actions, terrain effects, range, and invalid phase actions', () => {
    const active = session([piece('woods', 'woods', 2, 0)]);
    const actions = genericSkirmishAdapter.legalActions({ session: active, unitId: 'red-line' });
    const terrain = genericSkirmishAdapter.terrainEffects({ session: active, position: { x: 2, y: 0 } });
    const range = genericSkirmishAdapter.range({ from: { x: 0, y: 0 }, to: { x: 6, y: 3 }, maximum: 6 });
    const inactive = genericSkirmishAdapter.legalActions({ session: session([], 'deployment'), unitId: 'red-line' });
    expect(actions).toMatchObject({ ok: true, value: ['move', 'attack', 'secure-objective'], explanation: { outcome: 'resolved', inputs: expect.any(Array), assumptions: expect.any(Array) } });
    expect(terrain).toMatchObject({ ok: true, value: [expect.objectContaining({ grantsCover: true, movementBlocked: false })], explanation: { terrain: ['woods: woods at 2, 0'] } });
    expect(range).toMatchObject({ ok: true, value: { distance: 6, inRange: true }, explanation: { title: 'Range check' } });
    expect(inactive).toMatchObject({ ok: true, value: [], explanation: { summary: expect.stringMatching(/no legal action/i) } });
  });
});

describe('pure tactical spatial helpers', () => {
  const policy: TerrainSpatialPolicy = { blocksMovement: (terrain) => terrain.kind === 'wall', blocksLineOfSight: (terrain) => terrain.kind === 'wall', grantsCover: (terrain) => terrain.kind === 'woods' };

  it('uses deterministic four-way movement, square-grid range, and supercover rays', () => {
    expect(gridMovementDistance({ x: 0, y: 0 }, { x: 2, y: 1 })).toBe(3);
    expect(gridRangeDistance({ x: 0, y: 0 }, { x: 2, y: 1 })).toBe(2);
    expect(supercoverRay({ x: 0, y: 0 }, { x: 2, y: 1 })).toEqual([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 }]);
  });

  it('finds a legal route around a local blocker, but rejects a sealed route and excessive distance', () => {
    const wall = terrain(piece('wall', 'wall', 1, 1));
    const detour = findGridPath({ width: 4, height: 3 }, { x: 0, y: 1 }, { x: 2, y: 1 }, 4, [wall], policy);
    const sealed = findGridPath({ width: 3, height: 2 }, { x: 0, y: 0 }, { x: 2, y: 0 }, 6, [terrain(piece('wall-1', 'wall', 1, 0, 1, 2))], policy);
    const distant = findGridPath({ width: 8, height: 1 }, { x: 0, y: 0 }, { x: 7, y: 0 }, 6, [], policy);
    expect(detour).toMatchObject({ reason: 'ok', distance: 4, path: expect.arrayContaining([{ x: 0, y: 1 }, { x: 2, y: 1 }]) });
    expect(sealed).toMatchObject({ reason: 'blocked', path: null });
    expect(distant).toMatchObject({ reason: 'too-far', path: null });
  });

  it('applies elevation hooks when deciding whether terrain blocks line of sight', () => {
    const lowWall = piece('low-wall', 'wall', 2, 0, 1, 1, { structureDetails: undefined });
    const lowTerrain = [terrain(lowWall, 0, 1)];
    const tallTerrain = [terrain(lowWall, 0, 4)];
    expect(lineOfSight({ x: 0, y: 0 }, { x: 4, y: 0 }, lowTerrain, policy, { observerInches: 3, targetInches: 3 })).toMatchObject({ clear: true });
    expect(lineOfSight({ x: 0, y: 0 }, { x: 4, y: 0 }, tallTerrain, policy, { observerInches: 3, targetInches: 3 })).toMatchObject({ clear: false, blockers: [expect.objectContaining({ sourcePieceId: 'low-wall' })] });
  });
});

describe('generic skirmish tactical resolution', () => {
  it('explains a blocked movement route without mutating the session', () => {
    const value = session([piece('barrier', 'wall', 1, 0, 1, 36)]);
    const result = genericSkirmishAdapter.movement({ session: value, unitId: 'red-line', destination: { x: 2, y: 0 } });
    expect(result).toMatchObject({ ok: false, value: { path: { reason: 'blocked', path: null } }, explanation: { outcome: 'illegal', assumptions: expect.arrayContaining([expect.stringMatching(/four-way/)]), terrain: [expect.stringMatching(/barrier/)] } });
    expect(value.units.find((unit) => unit.id === 'red-line')?.position).toEqual({ x: 0, y: 0 });
  });

  it('reports range, LOS blockers, cover, and legal targets with their terrain contributions', () => {
    const blocked = session([piece('blocker', 'wall', 3, 0)]);
    const sight = genericSkirmishAdapter.lineOfSight({ session: blocked, observerId: 'red-line', targetId: 'blue-line' });
    const targets = genericSkirmishAdapter.legalTargets({ session: blocked, unitId: 'red-line' });
    const covered = session([piece('copse', 'woods', 6, 0)]);
    const cover = genericSkirmishAdapter.cover({ session: covered, observerId: 'red-line', targetId: 'blue-line' });
    const outOfRange = genericSkirmishAdapter.range({ from: { x: 0, y: 0 }, to: { x: 13, y: 0 }, maximum: 12 });
    expect(sight).toMatchObject({ ok: false, explanation: { terrain: ['blocker: wall at 3, 0'], summary: expect.stringMatching(/blocked/i) } });
    expect(targets.value).toEqual([expect.objectContaining({ unitId: 'blue-line', legal: false, reason: 'Target has no line of sight.' }), expect.objectContaining({ unitId: 'red-scout', legal: false, reason: 'Target is not deployed.' })]);
    expect(cover).toMatchObject({ ok: true, value: { covered: true, terrain: [expect.objectContaining({ name: 'copse' })] }, explanation: { terrain: ['copse: woods at 6, 0'] } });
    expect(outOfRange).toMatchObject({ ok: false, value: { inRange: false, distance: 13 }, explanation: { outcome: 'illegal' } });
  });

  it('scores a board-anchored objective deterministically and detects contesting units', () => {
    const objective = piece('cache', 'objective', 8, 0);
    const controlled = { ...session([objective]), units: [{ id: 'red-line', factionId: 'red', name: 'Line team', position: { x: 8, y: 0 } }, { id: 'blue-line', factionId: 'blue', name: 'Line team', position: { x: 6, y: 0 } }, { id: 'red-scout', factionId: 'red', name: 'Scout team', position: null }] };
    const contested = { ...controlled, units: controlled.units.map((unit) => unit.id === 'blue-line' ? { ...unit, position: { x: 8, y: 0 } } : unit) };
    expect(genericSkirmishAdapter.objectiveScoring({ session: controlled, factionId: 'red', objectiveId: 'objective-cache' })).toMatchObject({ ok: true, value: { controlled: true, points: 1 }, explanation: { terrain: ['cache: objective at 8, 0'] } });
    expect(genericSkirmishAdapter.objectiveScoring({ session: contested, factionId: 'red', objectiveId: 'objective-cache' })).toMatchObject({ ok: true, value: { controlled: false, points: 0 }, explanation: { summary: expect.stringMatching(/contested/i) } });
  });

  it('uses only the supplied PRNG state and exposes deterministic roll inputs and outcome', () => {
    const seed = createRandomState('repeatable');
    const first = genericSkirmishAdapter.resolveRoll({ random: seed, minimum: 1, maximum: 6, target: 4, label: 'Line attack' });
    const second = genericSkirmishAdapter.resolveRoll({ random: seed, minimum: 1, maximum: 6, target: 4, label: 'Line attack' });
    expect(second).toEqual(first);
    expect(first).toMatchObject({ ok: true, value: { result: expect.any(Number), success: expect.any(Boolean) }, explanation: { rolls: [expect.objectContaining({ label: 'Line attack', minimum: 1, maximum: 6, target: 4 })], assumptions: [expect.stringMatching(/no clock or ambient randomness/i)] } });
  });
});
