import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDraftPersistence, createSavedBoard, duplicateSavedBoard, listSavedBoards, openSavedBoard, renameSavedBoard, restoreDraft, saveBoard, saveDraftNow, type StorageLike } from './persistence';
import { newBoard } from './schema';

class MemoryStorage implements StorageLike {
  readonly values = new Map<string, string>();
  failWrites = false;
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) {
    if (this.failWrites) throw new Error('quota exceeded');
    this.values.set(key, value);
  }
  removeItem(key: string) { this.values.delete(key); }
}

const now = () => new Date('2026-08-26T12:00:00.000Z');
afterEach(() => vi.useRealTimers());

describe('draft persistence', () => {
  it('debounces valid draft writes and exposes explicit save state', () => {
    vi.useFakeTimers();
    const storage = new MemoryStorage();
    const states: string[] = [];
    const draft = newBoard({ now, idFactory: () => 'draft' });
    const persistence = createDraftPersistence(storage, { debounceMs: 250, onStateChange: (state) => states.push(state) });
    persistence.schedule(draft);
    expect(persistence.getState()).toBe('pending');
    expect(storage.values.size).toBe(0);
    vi.advanceTimersByTime(250);
    expect(persistence.getState()).toBe('saved');
    expect(restoreDraft(storage).status).toBe('restored');
    expect(states).toEqual(['pending', 'saved']);
  });

  it('does not replace a safe fallback or delete a corrupt draft', () => {
    const storage = new MemoryStorage();
    storage.setItem('battle-builder/v1/draft', '{not-json');
    const fallback = newBoard({ now, idFactory: () => 'fallback' });
    const restored = restoreDraft(storage, fallback);
    expect(restored).toMatchObject({ status: 'corrupt', document: fallback });
    expect(storage.getItem('battle-builder/v1/draft')).toBe('{not-json');
  });

  it('reports storage failures instead of throwing', () => {
    const storage = new MemoryStorage();
    storage.failWrites = true;
    expect(saveDraftNow(storage, newBoard({ now, idFactory: () => 'draft' }))).toMatchObject({ ok: false, message: expect.stringMatching(/quota/) });
  });
});

describe('saved-board library', () => {
  it('creates, opens, duplicates, and renames boards without using the draft key', () => {
    const storage = new MemoryStorage();
    const created = createSavedBoard(storage, { now, idFactory: () => 'original', name: 'Alpha board' });
    expect(created).toMatchObject({ ok: true, value: { id: 'original', name: 'Alpha board' } });
    const opened = openSavedBoard(storage, 'original');
    expect(opened).toMatchObject({ ok: true, value: { name: 'Alpha board' } });
    const duplicate = duplicateSavedBoard(storage, 'original', { now, idFactory: () => 'duplicate' });
    expect(duplicate).toMatchObject({ ok: true, value: { id: 'duplicate', name: 'Copy of Alpha board' } });
    const renamed = renameSavedBoard(storage, 'duplicate', 'Bravo board', now);
    expect(renamed).toMatchObject({ ok: true, value: { name: 'Bravo board' } });
    expect(listSavedBoards(storage)).toMatchObject({ ok: true, value: expect.arrayContaining([expect.objectContaining({ id: 'original' }), expect.objectContaining({ id: 'duplicate', name: 'Bravo board' })]) });
    expect([...storage.values.keys()]).not.toContain('battle-builder/v1/draft');
  });

  it('does not overwrite a corrupt saved-board index or return invalid documents', () => {
    const storage = new MemoryStorage();
    storage.setItem('battle-builder/v1/boards/index', '{bad');
    const board = newBoard({ now, idFactory: () => 'new' });
    expect(saveBoard(storage, board, now)).toMatchObject({ ok: false, message: expect.stringMatching(/index/) });
    expect(storage.getItem('battle-builder/v1/boards/index')).toBe('{bad');
  });
});
