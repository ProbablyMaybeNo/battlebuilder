import { describe, expect, it } from 'vitest';
import { starterBoard } from '../document/schema';
import { deploymentZones, validateDeployment } from './deployment';
import { initialBattleSession } from './session';

const at = '2026-08-28T13:00:00.000Z';
const session = () => initialBattleSession({ type: 'session.create', id: 'create', at, sessionId: 'session', name: 'Deployment', board: starterBoard({ now: () => new Date(at), idFactory: () => 'board' }), seed: 'seed', adapter: { id: 'generic', version: '1' }, factions: [{ id: 'cyan', name: 'Cyan' }, { id: 'violet', name: 'Violet' }], units: [{ id: 'cyan-1', factionId: 'cyan', name: 'Cyan one', position: null }, { id: 'violet-1', factionId: 'violet', name: 'Violet one', position: { x: 35, y: 0 } }], objectives: [] });

describe('generic deployment constraints', () => {
  it('derives bounded faction zones from the immutable board snapshot', () => {
    const zones = deploymentZones(session());
    expect(zones).toHaveLength(2);
    expect(zones[0]).toMatchObject({ factionId: 'cyan', x: 0, width: 6, height: 36 });
    expect(zones[1]).toMatchObject({ factionId: 'violet', x: 30, width: 6 });
  });

  it('rejects wrong zones, occupied cells, bounds, and accepts a legal deployment', () => {
    const value = session();
    expect(validateDeployment(value, 'cyan-1', { x: 30, y: 1 })).toMatchObject({ ok: false, reason: expect.stringMatching(/zone/) });
    expect(validateDeployment(value, 'cyan-1', { x: 35, y: 0 })).toMatchObject({ ok: false, reason: expect.stringMatching(/zone/) });
    expect(validateDeployment(value, 'cyan-1', { x: -1, y: 0 })).toMatchObject({ ok: false, reason: expect.stringMatching(/bounds/) });
    expect(validateDeployment(value, 'cyan-1', { x: 3, y: 4 })).toMatchObject({ ok: false, reason: expect.stringMatching(/blocking terrain/) });
    expect(validateDeployment(value, 'cyan-1', { x: 2, y: 4 })).toMatchObject({ ok: true, zone: { factionId: 'cyan' } });
  });
});
