import { describe, expect, it } from 'vitest';
import { commit, createHistory, redo, undo } from './history';
import { newBoard } from './schema';

const now = () => new Date('2026-08-26T12:00:00.000Z');
const board = (name: string) => newBoard({ now, idFactory: () => name, name });

describe('bounded immutable board history', () => {
  it('undos, redoes, and discards redo after a fresh mutation', () => {
    const first = createHistory(board('first'));
    const second = commit(first, board('second'));
    const third = commit(second, board('third'));
    expect(undo(third).present.name).toBe('second');
    expect(redo(undo(third)).present.name).toBe('third');
    const branched = commit(undo(third), board('replacement'));
    expect(branched.future).toEqual([]);
    expect(branched.present.name).toBe('replacement');
  });

  it('keeps at most fifty prior snapshots', () => {
    let history = createHistory(board('zero'));
    for (let index = 1; index <= 60; index += 1) history = commit(history, board(String(index)));
    expect(history.past).toHaveLength(50);
    expect(history.past[0].name).toBe('10');
    expect(history.present.name).toBe('60');
  });
});
