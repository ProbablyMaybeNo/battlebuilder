import { describe, expect, it } from 'vitest';
import { newBoard, type BoardDocument } from '../document/schema';
import type { BattleCommand, BattleSession, SessionCreateCommand } from './contracts';
import { battleSessionMigrations, migrateBattleSession } from './migrations';
import { createRandomState, nextRandom, rollRandom } from './prng';
import { replayBattleSession, reduceBattleSession } from './reducer';
import { initialBattleSession, parseBattleSession, validateBattleSessionImport } from './session';
import { terrainFactsFromBoard } from './terrain';

const at = '2026-08-28T12:00:00.000Z';
const board = (): BoardDocument => newBoard({ now: () => new Date(at), idFactory: () => 'board-1' });
const create = (source = board()): SessionCreateCommand => ({
  type: 'session.create', id: 'create-1', at, sessionId: 'session-1', name: 'Deterministic engagement', board: source, seed: 'repeatable-seed', adapter: { id: 'generic', version: '0' }, factions: [{ id: 'red', name: 'Red force' }, { id: 'blue', name: 'Blue force' }], units: [{ id: 'unit-red', factionId: 'red', name: 'Red one', position: null }], objectives: [{ id: 'objective-1', sourcePieceId: null, state: 'inactive' }],
});
const commands: readonly BattleCommand[] = [
  { type: 'unit.deploy', id: 'deploy-1', at: '2026-08-28T12:01:00.000Z', unitId: 'unit-red', position: { x: 4, y: 5 } },
  { type: 'phase.change', id: 'phase-1', at: '2026-08-28T12:02:00.000Z', phase: 'command', activeFactionId: 'red', round: 1 },
  { type: 'move.intent', id: 'move-1', at: '2026-08-28T12:03:00.000Z', unitId: 'unit-red', destination: { x: 7, y: 5 } },
  { type: 'roll.request', id: 'roll-1', at: '2026-08-28T12:04:00.000Z', rollId: 'attack-1', minimum: 1, maximum: 6 },
  { type: 'objective.state', id: 'objective-1', at: '2026-08-28T12:05:00.000Z', objectiveId: 'objective-1', state: 'secured' },
  { type: 'log.append', id: 'log-1', at: '2026-08-28T12:06:00.000Z', message: 'Command complete.' },
];

const play = (): BattleSession => {
  let result = reduceBattleSession(null, create());
  expect(result.ok).toBe(true);
  for (const command of commands) {
    if (!result.ok) throw new Error(result.message);
    result = reduceBattleSession(result.session, command);
    expect(result.ok).toBe(true);
  }
  if (!result.ok) throw new Error(result.message);
  return result.session;
};

describe('deterministic simulation engine', () => {
  it('has a seeded, serializable bounded random source', () => {
    const seed = createRandomState('stable');
    const first = nextRandom(seed);
    expect(nextRandom(seed)).toEqual(first);
    const roll = rollRandom(first.random, 1, 6);
    expect(roll.result).toBeGreaterThanOrEqual(1);
    expect(roll.result).toBeLessThanOrEqual(6);
    expect(() => rollRandom(seed, 6, 1)).toThrow(/bounds/);
  });

  it('replays identical commands and seed into an identical state and event history', () => {
    const first = play();
    const second = play();
    expect(second).toEqual(first);
    expect(first.events.map((event) => event.type)).toEqual(['session.created', 'unit.deployed', 'phase.changed', 'move.intent.recorded', 'roll.requested', 'roll.resolved', 'objective.state.changed', 'log.appended']);
    const replayed = replayBattleSession(first);
    expect(replayed).toMatchObject({ ok: true, session: first });
  });

  it('replays a newly created session without introducing an implicit mutation', () => {
    const session = initialBattleSession(create());
    expect(replayBattleSession(session)).toMatchObject({ ok: true, session });
    const parsed = parseBattleSession(JSON.parse(JSON.stringify(session)));
    expect(replayBattleSession(parsed)).toMatchObject({ ok: true, session: parsed });
  });

  it('keeps typed invalid commands non-destructive', () => {
    const session = initialBattleSession(create());
    const invalid = reduceBattleSession(session, { type: 'unit.deploy', id: 'deploy-bad', at, unitId: 'unknown', position: { x: 1, y: 1 } });
    expect(invalid).toMatchObject({ ok: false, session, message: expect.stringMatching(/unknown unit/) });
    expect(reduceBattleSession(session, { type: 'roll.request', id: 'bad-roll', at, rollId: 'bad', minimum: 7, maximum: 1 })).toMatchObject({ ok: false, message: expect.stringMatching(/minimum/) });
  });
});

describe('battle session contract and board bridge', () => {
  it('uses a board snapshot and terrain facts without adding simulator fields to the board', () => {
    const source = board();
    const session = initialBattleSession(create(source));
    expect(session.board.boardId).toBe(source.id);
    expect(session.terrain).toEqual(terrainFactsFromBoard(source));
    source.name = 'Changed after battle creation';
    expect(session.board.snapshot.name).not.toBe(source.name);
    expect(source).not.toHaveProperty('terrain');
    expect(source).not.toHaveProperty('session');
  });

  it('validates imported sessions, migrations, and derived terrain consistency', () => {
    const session = play();
    expect(parseBattleSession(JSON.parse(JSON.stringify(session)))).toEqual(session);
    expect(validateBattleSessionImport('{bad').ok).toBe(false);
    expect(() => parseBattleSession({ ...session, terrain: [{ sourcePieceId: 'forged' }] })).toThrow(/terrain facts/);
    expect(() => parseBattleSession({ ...session, version: 2 })).toThrow(/unsupported/);
    expect(migrateBattleSession({ version: 1, id: 'future-fields' })).toMatchObject({ version: 1 });
    expect(battleSessionMigrations[1]({ version: 1 })).toEqual({ version: 1 });
  });
});
