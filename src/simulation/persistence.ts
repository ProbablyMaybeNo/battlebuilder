import type { StorageLike } from '../document/persistence';
import { parseBattleSession, type BattleSessionImportResult } from './session';
import type { BattleSession } from './contracts';
import { replayBattleSession } from './reducer';

export const BATTLE_SESSION_DRAFT_KEY = 'battle-builder/v1/session/draft';
export type BattleSessionPersistenceResult = { ok: true } | { ok: false; message: string };
export type BattleSessionRestoreResult =
  | { status: 'missing'; session: null }
  | { status: 'restored'; session: BattleSession }
  | { status: 'corrupt' | 'unavailable'; session: BattleSession | null; message: string };

const messageFor = (error: unknown, fallback: string) => error instanceof Error && error.message ? error.message : fallback;
const canonicalJson = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
};

/** Uses its own namespace and never reads, replaces, or clears planner draft storage. */
export function saveBattleSessionDraftNow(storage: StorageLike, session: BattleSession): BattleSessionPersistenceResult {
  try {
    const imported = validateBattleSessionImport(JSON.stringify(session));
    if (!imported.ok) return { ok: false, message: `Battle session could not be saved: ${imported.message}` };
    storage.setItem(BATTLE_SESSION_DRAFT_KEY, JSON.stringify(imported.session));
    return { ok: true };
  } catch (error) {
    return { ok: false, message: `Battle session could not be saved: ${messageFor(error, 'storage is unavailable.')}` };
  }
}

/** Never removes an unreadable session; callers retain their supplied safe session. */
export function restoreBattleSessionDraft(storage: StorageLike, fallback: BattleSession | null = null): BattleSessionRestoreResult {
  let raw: string | null;
  try { raw = storage.getItem(BATTLE_SESSION_DRAFT_KEY); }
  catch (error) { return { status: 'unavailable', session: fallback, message: `Battle session could not be read: ${messageFor(error, 'storage is unavailable.')}` }; }
  if (!raw) return { status: 'missing', session: null };
  const imported = validateBattleSessionImport(raw);
  return imported.ok ? { status: 'restored', session: imported.session } : { status: 'corrupt', session: fallback, message: `Saved battle session was ignored because it is invalid: ${imported.message}` };
}

export function validateBattleSessionImport(input: string): BattleSessionImportResult {
  try {
    const session = parseBattleSession(JSON.parse(input) as unknown);
    const replayed = replayBattleSession(session);
    if (!replayed.ok || canonicalJson(replayed.session) !== canonicalJson(session)) throw new Error(replayed.ok ? 'Battle session replay does not match its serialized state.' : replayed.message);
    return { ok: true, session };
  }
  catch (error) { return { ok: false, message: messageFor(error, 'This file could not be read.') }; }
}

export function exportBattleSession(session: BattleSession): string {
  const imported = validateBattleSessionImport(JSON.stringify(session));
  if (!imported.ok) throw new Error(imported.message);
  return JSON.stringify(imported.session, null, 2);
}
