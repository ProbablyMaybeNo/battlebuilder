import type { BoardDocument } from './schema';
export interface History { past: BoardDocument[]; present: BoardDocument; future: BoardDocument[]; }
export const createHistory = (document: BoardDocument): History => ({ past: [], present: document, future: [] });
export const commit = (history: History, next: BoardDocument): History => ({ past: [...history.past.slice(-49), history.present], present: { ...next, updatedAt: new Date().toISOString() }, future: [] });
export const undo = (history: History): History => history.past.length ? { past: history.past.slice(0, -1), present: history.past.at(-1)!, future: [history.present, ...history.future] } : history;
export const redo = (history: History): History => history.future.length ? { past: [...history.past, history.present], present: history.future[0], future: history.future.slice(1) } : history;
