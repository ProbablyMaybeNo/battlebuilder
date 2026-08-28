import { describe, expect, it } from 'vitest';
import { DRAFT_KEY, type StorageLike } from '../document/persistence';
import type { SessionCreateCommand } from './contracts';
import { BATTLE_SESSION_DRAFT_KEY, exportBattleSession, restoreBattleSessionDraft, saveBattleSessionDraftNow, validateBattleSessionImport } from './persistence';
import { initialBattleSession } from './session';
import { newBoard } from '../document/schema';

class MemoryStorage implements StorageLike {
  readonly values = new Map<string, string>();
  failWrites = false;
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { if (this.failWrites) throw new Error('quota exceeded'); this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

const at = '2026-08-28T12:00:00.000Z';
const command = (): SessionCreateCommand => ({ type: 'session.create', id: 'create', at, sessionId: 'session', name: 'Session', board: newBoard({ now: () => new Date(at), idFactory: () => 'board' }), seed: 'seed', adapter: { id: 'generic', version: '0' }, factions: [], units: [], objectives: [] });

describe('battle-session persistence isolation and recovery', () => {
  it('uses a separate session namespace and round-trips import/export', () => {
    const storage = new MemoryStorage();
    const session = initialBattleSession(command());
    storage.setItem(DRAFT_KEY, 'planner stays here');
    expect(saveBattleSessionDraftNow(storage, session)).toEqual({ ok: true });
    expect(storage.getItem(DRAFT_KEY)).toBe('planner stays here');
    expect(storage.getItem(BATTLE_SESSION_DRAFT_KEY)).toBeTruthy();
    expect(restoreBattleSessionDraft(storage)).toMatchObject({ status: 'restored', session: { id: 'session' } });
    expect(validateBattleSessionImport(exportBattleSession(session))).toMatchObject({ ok: true, session: { id: 'session' } });
    const forged = { ...session, events: [{ ...session.events[0], sessionId: 'forged-session' }] };
    expect(validateBattleSessionImport(JSON.stringify(forged))).toMatchObject({ ok: false, message: expect.stringMatching(/replay/) });
  });

  it('retains a safe fallback and unreadable source when recovery fails', () => {
    const storage = new MemoryStorage();
    const fallback = initialBattleSession(command());
    storage.setItem(BATTLE_SESSION_DRAFT_KEY, '{bad');
    expect(restoreBattleSessionDraft(storage, fallback)).toMatchObject({ status: 'corrupt', session: fallback });
    expect(storage.getItem(BATTLE_SESSION_DRAFT_KEY)).toBe('{bad');
    storage.failWrites = true;
    expect(saveBattleSessionDraftNow(storage, fallback)).toMatchObject({ ok: false, message: expect.stringMatching(/quota/) });
  });
});
