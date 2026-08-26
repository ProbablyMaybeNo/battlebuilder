import { newBoard, parseBoard, type BoardDocument, type BoardFactoryOptions } from './schema';

export const DRAFT_KEY = 'battle-builder/v1/draft';
export const SAVED_BOARDS_INDEX_KEY = 'battle-builder/v1/boards/index';
export const SAVED_BOARDS_KEY_PREFIX = 'battle-builder/v1/boards/';
export const MAX_SAVED_BOARDS = 50;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type SaveState = 'idle' | 'pending' | 'saved' | 'error';
export type PersistenceResult = { ok: true } | { ok: false; message: string };
export type DraftRestoreResult =
  | { status: 'missing'; document: null }
  | { status: 'restored'; document: BoardDocument }
  | { status: 'corrupt' | 'unavailable'; document: BoardDocument | null; message: string };

const toMessage = (error: unknown, fallback: string) => error instanceof Error && error.message ? error.message : fallback;
const boardKey = (id: string) => `${SAVED_BOARDS_KEY_PREFIX}${id}`;

const serializeBoard = (document: BoardDocument) => JSON.stringify(parseBoard(document));

export function saveDraftNow(storage: StorageLike, document: BoardDocument): PersistenceResult {
  try {
    storage.setItem(DRAFT_KEY, serializeBoard(document));
    return { ok: true };
  } catch (error) {
    return { ok: false, message: `Draft could not be saved: ${toMessage(error, 'storage is unavailable.')}` };
  }
}

/** Never deletes an unreadable draft; callers retain a safe fallback document. */
export function restoreDraft(storage: StorageLike, fallback: BoardDocument | null = null): DraftRestoreResult {
  let raw: string | null;
  try {
    raw = storage.getItem(DRAFT_KEY);
  } catch (error) {
    return { status: 'unavailable', document: fallback, message: `Draft could not be read: ${toMessage(error, 'storage is unavailable.')}` };
  }
  if (!raw) return { status: 'missing', document: null };
  try {
    return { status: 'restored', document: parseBoard(JSON.parse(raw) as unknown) };
  } catch (error) {
    return { status: 'corrupt', document: fallback, message: `Saved draft was ignored because it is invalid: ${toMessage(error, 'unknown error')}` };
  }
}

export interface DraftPersistence {
  schedule(document: BoardDocument): void;
  flush(): PersistenceResult;
  cancel(): void;
  getState(): SaveState;
}
export interface DraftPersistenceOptions {
  debounceMs?: number;
  onStateChange?: (state: SaveState) => void;
}

export function createDraftPersistence(storage: StorageLike, options: DraftPersistenceOptions = {}): DraftPersistence {
  const debounceMs = options.debounceMs ?? 400;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending: BoardDocument | undefined;
  let state: SaveState = 'idle';
  const setState = (next: SaveState) => { state = next; options.onStateChange?.(state); };
  const flush = (): PersistenceResult => {
    if (!pending) return state === 'error' ? { ok: false, message: 'Draft has no valid pending changes.' } : { ok: true };
    if (timer) { clearTimeout(timer); timer = undefined; }
    const result = saveDraftNow(storage, pending);
    if (result.ok) { pending = undefined; setState('saved'); } else setState('error');
    return result;
  };
  return {
    schedule(document) {
      try {
        // Validate synchronously so invalid editor state can never reach storage.
        pending = parseBoard(document);
      } catch {
        pending = undefined;
        if (timer) { clearTimeout(timer); timer = undefined; }
        setState('error');
        return;
      }
      if (timer) clearTimeout(timer);
      setState('pending');
      timer = setTimeout(() => { flush(); }, debounceMs);
    },
    flush,
    cancel() {
      if (timer) clearTimeout(timer);
      timer = undefined;
      pending = undefined;
      setState('idle');
    },
    getState: () => state,
  };
}

export interface SavedBoardSummary { id: string; name: string; createdAt: string; updatedAt: string; }
interface SavedBoardIndex { version: 1; boards: SavedBoardSummary[]; }
export type LibraryResult<T> = { ok: true; value: T } | { ok: false; message: string };

const parseIndex = (raw: string | null): SavedBoardIndex => {
  if (!raw) return { version: 1, boards: [] };
  const value = JSON.parse(raw) as unknown;
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('saved-board index is not an object');
  const index = value as Record<string, unknown>;
  if (index.version !== 1 || !Array.isArray(index.boards)) throw new Error('saved-board index version is not supported');
  const boards = index.boards.map((summary, position) => {
    if (typeof summary !== 'object' || summary === null || Array.isArray(summary)) throw new Error(`saved-board entry ${position + 1} is invalid`);
    const entry = summary as Record<string, unknown>;
    if (typeof entry.id !== 'string' || !entry.id.trim() || typeof entry.name !== 'string' || !entry.name.trim() || typeof entry.createdAt !== 'string' || typeof entry.updatedAt !== 'string' || !Number.isFinite(Date.parse(entry.createdAt)) || !Number.isFinite(Date.parse(entry.updatedAt))) throw new Error(`saved-board entry ${position + 1} is invalid`);
    return { id: entry.id, name: entry.name, createdAt: entry.createdAt, updatedAt: entry.updatedAt };
  });
  if (new Set(boards.map((board) => board.id)).size !== boards.length) throw new Error('saved-board index contains duplicate IDs');
  return { version: 1, boards };
};

const readIndex = (storage: StorageLike): LibraryResult<SavedBoardIndex> => {
  try { return { ok: true, value: parseIndex(storage.getItem(SAVED_BOARDS_INDEX_KEY)) }; }
  catch (error) { return { ok: false, message: `Saved-board index could not be read: ${toMessage(error, 'unknown error')}` }; }
};
const stamp = (document: BoardDocument, now: () => Date): BoardDocument => parseBoard({ ...document, updatedAt: now().toISOString() });

export function listSavedBoards(storage: StorageLike): LibraryResult<SavedBoardSummary[]> {
  const index = readIndex(storage);
  if (!index.ok) return index;
  return { ok: true, value: [...index.value.boards].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)) };
}

export function saveBoard(storage: StorageLike, document: BoardDocument, now: () => Date = () => new Date()): LibraryResult<BoardDocument> {
  const index = readIndex(storage);
  if (!index.ok) return index;
  let saved: BoardDocument;
  try { saved = stamp(document, now); } catch (error) { return { ok: false, message: `Board could not be saved: ${toMessage(error, 'invalid document')}` }; }
  const summary: SavedBoardSummary = { id: saved.id, name: saved.name, createdAt: saved.createdAt, updatedAt: saved.updatedAt };
  const withoutCurrent = index.value.boards.filter((entry) => entry.id !== saved.id);
  const nextIndex: SavedBoardIndex = { version: 1, boards: [summary, ...withoutCurrent].slice(0, MAX_SAVED_BOARDS) };
  try {
    storage.setItem(boardKey(saved.id), JSON.stringify(saved));
    storage.setItem(SAVED_BOARDS_INDEX_KEY, JSON.stringify(nextIndex));
    return { ok: true, value: saved };
  } catch (error) {
    return { ok: false, message: `Board could not be saved: ${toMessage(error, 'storage is unavailable.')}` };
  }
}

export function openSavedBoard(storage: StorageLike, id: string): LibraryResult<BoardDocument> {
  try {
    const raw = storage.getItem(boardKey(id));
    if (!raw) return { ok: false, message: 'Saved board was not found.' };
    return { ok: true, value: parseBoard(JSON.parse(raw) as unknown) };
  } catch (error) {
    return { ok: false, message: `Saved board could not be opened: ${toMessage(error, 'unknown error')}` };
  }
}

export function createSavedBoard(storage: StorageLike, options: BoardFactoryOptions = {}): LibraryResult<BoardDocument> {
  const document = newBoard(options);
  return saveBoard(storage, document, options.now);
}

export function duplicateSavedBoard(storage: StorageLike, id: string, options: Pick<BoardFactoryOptions, 'idFactory' | 'now'> = {}): LibraryResult<BoardDocument> {
  const source = openSavedBoard(storage, id);
  if (!source.ok) return source;
  const now = (options.now?.() ?? new Date()).toISOString();
  const duplicate = parseBoard({ ...source.value, id: options.idFactory?.() ?? crypto.randomUUID(), name: `Copy of ${source.value.name}`, createdAt: now, updatedAt: now });
  return saveBoard(storage, duplicate, options.now);
}

export function renameSavedBoard(storage: StorageLike, id: string, name: string, now: () => Date = () => new Date()): LibraryResult<BoardDocument> {
  const source = openSavedBoard(storage, id);
  if (!source.ok) return source;
  try { return saveBoard(storage, parseBoard({ ...source.value, name }), now); }
  catch (error) { return { ok: false, message: `Board could not be renamed: ${toMessage(error, 'invalid name')}` }; }
}
