export const BOARD_SCHEMA_VERSION = 1 as const;
export const DRAFT_KEY = 'battle-builder/v1/draft';

export type PieceKind = 'building' | 'ruin' | 'platform' | 'road' | 'water' | 'wall' | 'woods' | 'rocks' | 'scatter' | 'objective' | 'marker';
export type Surface = 'midnight' | 'concrete' | 'sand';
export interface BoardSettings { width: number; height: number; grid: number; orientation: 'landscape' | 'portrait'; surface: Surface; snap: boolean; }
export interface Piece { id: string; kind: PieceKind; name: string; x: number; y: number; width: number; height: number; rotation: number; locked: boolean; hidden: boolean; layer: number; notes: string; }
export interface BoardDocument { version: typeof BOARD_SCHEMA_VERSION; id: string; name: string; updatedAt: string; settings: BoardSettings; pieces: Piece[]; }
export type ImportResult = { ok: true; document: BoardDocument } | { ok: false; message: string };

export const kinds: PieceKind[] = ['building', 'ruin', 'platform', 'road', 'water', 'wall', 'woods', 'rocks', 'scatter', 'objective', 'marker'];
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const number = (value: unknown, name: string, min: number, max: number) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max ? value : (() => { throw new Error(`${name} must be a number between ${min} and ${max}.`); })();
const text = (value: unknown, name: string, max = 120) => typeof value === 'string' && value.trim() && value.length <= max ? value : (() => { throw new Error(`${name} must be a non-empty string.`); })();

export const newBoard = (): BoardDocument => ({ version: BOARD_SCHEMA_VERSION, id: crypto.randomUUID(), name: 'Untitled tactical board', updatedAt: new Date().toISOString(), settings: { width: 36, height: 36, grid: 1, orientation: 'landscape', surface: 'midnight', snap: true }, pieces: [] });
export const starterBoard = (): BoardDocument => ({ ...newBoard(), name: 'Ashfall crossing', pieces: [
  { id: crypto.randomUUID(), kind: 'building', name: 'Relay station', x: 4, y: 5, width: 8, height: 5, rotation: 0, locked: false, hidden: false, layer: 1, notes: '' },
  { id: crypto.randomUUID(), kind: 'ruin', name: 'Broken annex', x: 21, y: 5, width: 6, height: 7, rotation: 0, locked: false, hidden: false, layer: 2, notes: '' },
  { id: crypto.randomUUID(), kind: 'road', name: 'North service road', x: 2, y: 19, width: 32, height: 3, rotation: 0, locked: false, hidden: false, layer: 0, notes: '' },
  { id: crypto.randomUUID(), kind: 'woods', name: 'Hollow copse', x: 25, y: 25, width: 8, height: 5, rotation: 0, locked: false, hidden: false, layer: 3, notes: '' },
  { id: crypto.randomUUID(), kind: 'objective', name: 'Signal cache', x: 16, y: 27, width: 2, height: 2, rotation: 0, locked: false, hidden: false, layer: 4, notes: 'Secure and relay.' }
] });

function parsePiece(value: unknown, index: number): Piece {
  if (!isRecord(value)) throw new Error(`Piece ${index + 1} is not an object.`);
  const kind = value.kind;
  if (typeof kind !== 'string' || !kinds.includes(kind as PieceKind)) throw new Error(`Piece ${index + 1} has an unsupported type.`);
  return { id: text(value.id, `Piece ${index + 1} id`, 80), kind: kind as PieceKind, name: text(value.name, `Piece ${index + 1} name`), x: number(value.x, 'x', -1000, 1000), y: number(value.y, 'y', -1000, 1000), width: number(value.width, 'width', .25, 1000), height: number(value.height, 'height', .25, 1000), rotation: number(value.rotation, 'rotation', 0, 359), locked: typeof value.locked === 'boolean' ? value.locked : false, hidden: typeof value.hidden === 'boolean' ? value.hidden : false, layer: number(value.layer, 'layer', -1000, 1000), notes: typeof value.notes === 'string' ? value.notes.slice(0, 2000) : '' };
}
export function parseBoard(value: unknown): BoardDocument {
  if (!isRecord(value)) throw new Error('The file must contain a board document object.');
  if (value.version !== BOARD_SCHEMA_VERSION) throw new Error(`This file uses unsupported board version “${String(value.version)}”.`);
  if (!isRecord(value.settings)) throw new Error('Board settings are missing.');
  const settings = value.settings;
  const orientation = settings.orientation;
  const surface = settings.surface;
  if (orientation !== 'landscape' && orientation !== 'portrait') throw new Error('Board orientation is invalid.');
  if (surface !== 'midnight' && surface !== 'concrete' && surface !== 'sand') throw new Error('Board surface is invalid.');
  if (!Array.isArray(value.pieces)) throw new Error('Board pieces must be an array.');
  const pieces = value.pieces.map(parsePiece); const ids = new Set(pieces.map(piece => piece.id));
  if (ids.size !== pieces.length) throw new Error('The import contains duplicate piece IDs.');
  return { version: BOARD_SCHEMA_VERSION, id: text(value.id, 'Board id', 80), name: text(value.name, 'Board name'), updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : new Date().toISOString(), settings: { width: number(settings.width, 'board width', 8, 120), height: number(settings.height, 'board height', 8, 120), grid: number(settings.grid, 'grid size', .25, 10), orientation, surface, snap: typeof settings.snap === 'boolean' ? settings.snap : true }, pieces };
}
export function validateImport(input: string): ImportResult { try { return { ok: true, document: parseBoard(JSON.parse(input)) }; } catch (error) { return { ok: false, message: error instanceof Error ? error.message : 'This file could not be read.' }; } }
export const saveDraft = (document: BoardDocument) => localStorage.setItem(DRAFT_KEY, JSON.stringify(document));
export function restoreDraft(): BoardDocument | null { const raw = localStorage.getItem(DRAFT_KEY); if (!raw) return null; const result = validateImport(raw); return result.ok ? result.document : null; }
