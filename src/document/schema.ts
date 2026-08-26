import { migrateBoardDocument } from './migrations';

export const BOARD_SCHEMA_VERSION = 1 as const;
export const DEFAULT_BOARD_SIZE_INCHES = 36;
export const MIN_BOARD_SIZE_INCHES = 12;
export const MAX_BOARD_SIZE_INCHES = 72;
export const GRID_CELL_SIZE_INCHES = 1 as const;

export type PieceKind = 'building' | 'ruin' | 'platform' | 'road' | 'water' | 'wall' | 'woods' | 'rocks' | 'scatter' | 'objective' | 'marker';
export type Surface = 'midnight' | 'concrete' | 'sand';
export type Orientation = 'landscape' | 'portrait';
export type RoofMode = 'roof' | 'interior';
export type WallSide = 'north' | 'east' | 'south' | 'west';

export interface BoardSettings { widthInches: number; heightInches: number; orientation: Orientation; surface: Surface; snap: boolean; }
export interface GridCell { x: number; y: number; }
export interface CellFootprint { kind: 'cells'; cells: GridCell[]; }
export interface PolygonFootprint { kind: 'polygon'; points: GridCell[]; }
export type StructureFootprint = CellFootprint | PolygonFootprint;
export interface AccessFeature { id: string; wall: WallSide; offset: number; span: number; }
export interface StructureDetails {
  footprint: StructureFootprint;
  elevationInches: number;
  heightInches: number;
  roofMode: RoofMode;
  doors: AccessFeature[];
  windows: AccessFeature[];
}
export interface Piece {
  id: string;
  kind: PieceKind;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  locked: boolean;
  hidden: boolean;
  layer: number;
  notes: string;
  structureDetails?: StructureDetails;
}
export interface BoardDocument {
  version: typeof BOARD_SCHEMA_VERSION;
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  settings: BoardSettings;
  pieces: Piece[];
}
export type ImportResult = { ok: true; document: BoardDocument } | { ok: false; message: string };

export const pieceKinds: readonly PieceKind[] = ['building', 'ruin', 'platform', 'road', 'water', 'wall', 'woods', 'rocks', 'scatter', 'objective', 'marker'] as const;
const structureKinds = new Set<PieceKind>(['building', 'ruin', 'platform']);
const wallSides = new Set<WallSide>(['north', 'east', 'south', 'west']);
const roofModes = new Set<RoofMode>(['roof', 'interior']);
const surfaces = new Set<Surface>(['midnight', 'concrete', 'sand']);
type UnknownRecord = Record<string, unknown>;

export class BoardValidationError extends Error {
  constructor(message: string) { super(message); this.name = 'BoardValidationError'; }
}

const isRecord = (value: unknown): value is UnknownRecord => typeof value === 'object' && value !== null && !Array.isArray(value);
const assertRecord = (value: unknown, name: string): UnknownRecord => {
  if (!isRecord(value)) throw new BoardValidationError(`${name} must be an object.`);
  return value;
};
const parseString = (value: unknown, name: string, maximum: number, allowBlank = false) => {
  if (typeof value !== 'string' || value.length > maximum || (!allowBlank && !value.trim())) throw new BoardValidationError(`${name} must be ${allowBlank ? 'text' : 'non-empty text'} up to ${maximum} characters.`);
  return value;
};
const parseNumber = (value: unknown, name: string, minimum: number, maximum: number, integer = false) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > maximum || (integer && !Number.isInteger(value))) {
    throw new BoardValidationError(`${name} must be ${integer ? 'an integer' : 'a finite number'} between ${minimum} and ${maximum}.`);
  }
  return value;
};
const parseBoolean = (value: unknown, name: string) => {
  if (typeof value !== 'boolean') throw new BoardValidationError(`${name} must be true or false.`);
  return value;
};
const parseTimestamp = (value: unknown, name: string) => {
  const timestamp = parseString(value, name, 64);
  if (!Number.isFinite(Date.parse(timestamp))) throw new BoardValidationError(`${name} must be a valid ISO timestamp.`);
  return timestamp;
};
export const isStructureKind = (kind: PieceKind): boolean => structureKinds.has(kind);

export function createRectangleFootprint(width: number, height: number): CellFootprint {
  const cells: GridCell[] = [];
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) cells.push({ x, y });
  return { kind: 'cells', cells };
}
export function createStructureDetails(width: number, height: number): StructureDetails {
  return { footprint: createRectangleFootprint(width, height), elevationInches: 0, heightInches: 6, roofMode: 'roof', doors: [], windows: [] };
}

const parseSettings = (value: unknown): BoardSettings => {
  const settings = assertRecord(value, 'Board settings');
  if ('grid' in settings) throw new BoardValidationError('Board grid size is fixed at one inch and cannot be configured.');
  const widthInches = parseNumber(settings.widthInches, 'Board width', MIN_BOARD_SIZE_INCHES, MAX_BOARD_SIZE_INCHES, true);
  const heightInches = parseNumber(settings.heightInches, 'Board height', MIN_BOARD_SIZE_INCHES, MAX_BOARD_SIZE_INCHES, true);
  if (settings.orientation !== 'landscape' && settings.orientation !== 'portrait') throw new BoardValidationError('Board orientation must be landscape or portrait.');
  if (typeof settings.surface !== 'string' || !surfaces.has(settings.surface as Surface)) throw new BoardValidationError('Board surface is not supported.');
  return { widthInches, heightInches, orientation: settings.orientation, surface: settings.surface as Surface, snap: parseBoolean(settings.snap, 'Board snap setting') };
};

const parseCells = (footprint: UnknownRecord, width: number, height: number, name: string): CellFootprint => {
  if (!Array.isArray(footprint.cells) || footprint.cells.length === 0) throw new BoardValidationError(`${name} cell footprint must contain at least one cell.`);
  const seen = new Set<string>();
  const cells = footprint.cells.map((cell, index) => {
    const raw = assertRecord(cell, `${name} footprint cell ${index + 1}`);
    const x = parseNumber(raw.x, `${name} footprint cell ${index + 1} x`, 0, width - 1, true);
    const y = parseNumber(raw.y, `${name} footprint cell ${index + 1} y`, 0, height - 1, true);
    const key = `${x},${y}`;
    if (seen.has(key)) throw new BoardValidationError(`${name} footprint contains a duplicate cell.`);
    seen.add(key);
    return { x, y };
  });
  return { kind: 'cells', cells };
};
const signedPolygonArea = (points: GridCell[]) => points.reduce((area, point, index) => {
  const next = points[(index + 1) % points.length];
  return area + point.x * next.y - next.x * point.y;
}, 0) / 2;
const orientationOf = (a: GridCell, b: GridCell, c: GridCell) => Math.sign((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x));
const pointOnSegment = (a: GridCell, b: GridCell, point: GridCell) => Math.min(a.x, b.x) <= point.x && point.x <= Math.max(a.x, b.x) && Math.min(a.y, b.y) <= point.y && point.y <= Math.max(a.y, b.y);
const segmentsIntersect = (a: GridCell, b: GridCell, c: GridCell, d: GridCell) => {
  const abC = orientationOf(a, b, c); const abD = orientationOf(a, b, d); const cdA = orientationOf(c, d, a); const cdB = orientationOf(c, d, b);
  if (abC !== abD && cdA !== cdB) return true;
  return (abC === 0 && pointOnSegment(a, b, c)) || (abD === 0 && pointOnSegment(a, b, d)) || (cdA === 0 && pointOnSegment(c, d, a)) || (cdB === 0 && pointOnSegment(c, d, b));
};
const parsePolygon = (footprint: UnknownRecord, width: number, height: number, name: string): PolygonFootprint => {
  if (!Array.isArray(footprint.points) || footprint.points.length < 3) throw new BoardValidationError(`${name} polygon footprint needs at least three points.`);
  const seen = new Set<string>();
  const points = footprint.points.map((point, index) => {
    const raw = assertRecord(point, `${name} footprint point ${index + 1}`);
    const x = parseNumber(raw.x, `${name} footprint point ${index + 1} x`, 0, width);
    const y = parseNumber(raw.y, `${name} footprint point ${index + 1} y`, 0, height);
    const key = `${x},${y}`;
    if (seen.has(key)) throw new BoardValidationError(`${name} polygon footprint repeats a point.`);
    seen.add(key);
    return { x, y };
  });
  for (let index = 0; index < points.length; index += 1) {
    const next = (index + 1) % points.length;
    for (let compare = index + 1; compare < points.length; compare += 1) {
      const compareNext = (compare + 1) % points.length;
      if (next === compare || compareNext === index) continue;
      if (segmentsIntersect(points[index], points[next], points[compare], points[compareNext])) throw new BoardValidationError(`${name} polygon footprint cannot self-intersect.`);
    }
  }
  if (Math.abs(signedPolygonArea(points)) < 0.0001) throw new BoardValidationError(`${name} polygon footprint must enclose area.`);
  return { kind: 'polygon', points };
};
const parseFootprint = (value: unknown, width: number, height: number, name: string): StructureFootprint => {
  const footprint = assertRecord(value, `${name} footprint`);
  if (footprint.kind === 'cells') return parseCells(footprint, width, height, name);
  if (footprint.kind === 'polygon') return parsePolygon(footprint, width, height, name);
  throw new BoardValidationError(`${name} footprint kind must be cells or polygon.`);
};

const parseAccessFeature = (value: unknown, name: string): AccessFeature => {
  const feature = assertRecord(value, name);
  if (typeof feature.wall !== 'string' || !wallSides.has(feature.wall as WallSide)) throw new BoardValidationError(`${name} must use a valid exterior wall.`);
  return { id: parseString(feature.id, `${name} id`, 80), wall: feature.wall as WallSide, offset: parseNumber(feature.offset, `${name} offset`, 0, MAX_BOARD_SIZE_INCHES - 1, true), span: parseNumber(feature.span, `${name} span`, 1, MAX_BOARD_SIZE_INCHES, true) };
};
const exteriorCellsFor = (feature: AccessFeature, width: number, height: number): GridCell[] => {
  const cells: GridCell[] = [];
  for (let offset = feature.offset; offset < feature.offset + feature.span; offset += 1) {
    if (feature.wall === 'north') cells.push({ x: offset, y: 0 });
    if (feature.wall === 'south') cells.push({ x: offset, y: height - 1 });
    if (feature.wall === 'west') cells.push({ x: 0, y: offset });
    if (feature.wall === 'east') cells.push({ x: width - 1, y: offset });
  }
  return cells;
};
const validateAccessCollections = (doors: AccessFeature[], windows: AccessFeature[], footprint: StructureFootprint, width: number, height: number, name: string) => {
  const features = [...doors, ...windows];
  if (new Set(features.map((feature) => feature.id)).size !== features.length) throw new BoardValidationError(`${name} doors and windows need unique IDs.`);
  const cells = footprint.kind === 'cells' ? new Set(footprint.cells.map((cell) => `${cell.x},${cell.y}`)) : null;
  for (const feature of features) {
    const wallLength = feature.wall === 'north' || feature.wall === 'south' ? width : height;
    if (feature.offset + feature.span > wallLength) throw new BoardValidationError(`${name} access feature extends beyond its ${feature.wall} wall.`);
    if (!cells) throw new BoardValidationError(`${name} polygon footprints cannot carry grid-snapped doors or windows.`);
    if (exteriorCellsFor(feature, width, height).some((cell) => !cells.has(`${cell.x},${cell.y}`))) throw new BoardValidationError(`${name} access feature must attach to an occupied exterior wall.`);
  }
  for (let left = 0; left < features.length; left += 1) for (let right = left + 1; right < features.length; right += 1) {
    if (features[left].wall === features[right].wall && features[left].offset < features[right].offset + features[right].span && features[right].offset < features[left].offset + features[left].span) throw new BoardValidationError(`${name} doors and windows cannot overlap on the same wall.`);
  }
};
const parseStructureDetails = (value: unknown, piece: Pick<Piece, 'kind' | 'name' | 'width' | 'height'>): StructureDetails => {
  const structure = assertRecord(value, `${piece.name} structure details`);
  if (typeof structure.roofMode !== 'string' || !roofModes.has(structure.roofMode as RoofMode)) throw new BoardValidationError(`${piece.name} roof mode must be roof or interior.`);
  const footprint = parseFootprint(structure.footprint, piece.width, piece.height, piece.name);
  if (!Array.isArray(structure.doors) || !Array.isArray(structure.windows)) throw new BoardValidationError(`${piece.name} doors and windows must be arrays.`);
  const doors = structure.doors.map((feature, index) => parseAccessFeature(feature, `${piece.name} door ${index + 1}`));
  const windows = structure.windows.map((feature, index) => parseAccessFeature(feature, `${piece.name} window ${index + 1}`));
  if (piece.kind === 'platform' && (doors.length || windows.length)) throw new BoardValidationError(`${piece.name} is a platform and cannot contain doors or windows.`);
  validateAccessCollections(doors, windows, footprint, piece.width, piece.height, piece.name);
  return { footprint, elevationInches: parseNumber(structure.elevationInches, `${piece.name} elevation`, -72, 72), heightInches: parseNumber(structure.heightInches, `${piece.name} height`, 1, 72), roofMode: structure.roofMode as RoofMode, doors, windows };
};
const parsePiece = (value: unknown, index: number, settings: BoardSettings): Piece => {
  const raw = assertRecord(value, `Piece ${index + 1}`);
  if (typeof raw.kind !== 'string' || !pieceKinds.includes(raw.kind as PieceKind)) throw new BoardValidationError(`Piece ${index + 1} has an unsupported type.`);
  const piece: Omit<Piece, 'structureDetails'> = {
    id: parseString(raw.id, `Piece ${index + 1} id`, 80), kind: raw.kind as PieceKind, name: parseString(raw.name, `Piece ${index + 1} name`, 120),
    x: parseNumber(raw.x, `Piece ${index + 1} x`, 0, settings.widthInches - 1, true), y: parseNumber(raw.y, `Piece ${index + 1} y`, 0, settings.heightInches - 1, true),
    width: parseNumber(raw.width, `Piece ${index + 1} width`, 1, MAX_BOARD_SIZE_INCHES, true), height: parseNumber(raw.height, `Piece ${index + 1} height`, 1, MAX_BOARD_SIZE_INCHES, true),
    rotation: parseNumber(raw.rotation, `Piece ${index + 1} rotation`, 0, 359.999), locked: parseBoolean(raw.locked, `Piece ${index + 1} lock state`), hidden: parseBoolean(raw.hidden, `Piece ${index + 1} hidden state`), layer: parseNumber(raw.layer, `Piece ${index + 1} layer`, -1000, 1000, true), notes: parseString(raw.notes, `Piece ${index + 1} notes`, 2000, true),
  };
  if (piece.x + piece.width > settings.widthInches || piece.y + piece.height > settings.heightInches) throw new BoardValidationError(`Piece ${index + 1} must fit within the board bounds.`);
  if (isStructureKind(piece.kind)) return { ...piece, structureDetails: parseStructureDetails(raw.structureDetails, piece) };
  if (raw.structureDetails !== undefined) throw new BoardValidationError(`Piece ${index + 1} is not a structure and cannot have structure details.`);
  return piece;
};

export function parseBoard(value: unknown): BoardDocument {
  const raw = assertRecord(migrateBoardDocument(value), 'Board document');
  if (raw.version !== BOARD_SCHEMA_VERSION) throw new BoardValidationError(`This file uses unsupported board version “${String(raw.version)}”.`);
  if (!Array.isArray(raw.pieces)) throw new BoardValidationError('Board pieces must be an array.');
  const settings = parseSettings(raw.settings);
  const pieces = raw.pieces.map((piece, index) => parsePiece(piece, index, settings));
  if (new Set(pieces.map((piece) => piece.id)).size !== pieces.length) throw new BoardValidationError('The import contains duplicate piece IDs.');
  return { version: BOARD_SCHEMA_VERSION, id: parseString(raw.id, 'Board id', 80), name: parseString(raw.name, 'Board name', 120), createdAt: parseTimestamp(raw.createdAt, 'Board created timestamp'), updatedAt: parseTimestamp(raw.updatedAt, 'Board updated timestamp'), settings, pieces };
}
export function validateImport(input: string): ImportResult {
  try { return { ok: true, document: parseBoard(JSON.parse(input) as unknown) }; }
  catch (error) { return { ok: false, message: error instanceof Error ? error.message : 'This file could not be read.' }; }
}
export interface BoardFactoryOptions { idFactory?: () => string; now?: () => Date; name?: string; settings?: Partial<BoardSettings>; }
export function newBoard(options: BoardFactoryOptions = {}): BoardDocument {
  const now = (options.now?.() ?? new Date()).toISOString();
  return parseBoard({
    version: BOARD_SCHEMA_VERSION, id: options.idFactory?.() ?? crypto.randomUUID(), name: options.name ?? 'Untitled tactical board', createdAt: now, updatedAt: now,
    settings: { widthInches: options.settings?.widthInches ?? DEFAULT_BOARD_SIZE_INCHES, heightInches: options.settings?.heightInches ?? DEFAULT_BOARD_SIZE_INCHES, orientation: options.settings?.orientation ?? 'landscape', surface: options.settings?.surface ?? 'midnight', snap: options.settings?.snap ?? true }, pieces: [],
  });
}
const starterPiece = (id: string, kind: PieceKind, name: string, x: number, y: number, width: number, height: number, layer: number): Piece => ({ id, kind, name, x, y, width, height, rotation: 0, locked: false, hidden: false, layer, notes: '', ...(isStructureKind(kind) ? { structureDetails: createStructureDetails(width, height) } : {}) });
export function starterBoard(options: BoardFactoryOptions = {}): BoardDocument {
  let serial = 0; const idFactory = options.idFactory ?? (() => crypto.randomUUID());
  const board = newBoard({ ...options, name: options.name ?? 'Ashfall crossing', idFactory });
  const pieceId = () => `${idFactory()}-${serial += 1}`;
  return parseBoard({ ...board, pieces: [starterPiece(pieceId(), 'building', 'Relay station', 4, 5, 8, 5, 1), starterPiece(pieceId(), 'ruin', 'Broken annex', 21, 5, 6, 7, 2), starterPiece(pieceId(), 'road', 'North service road', 2, 19, 32, 3, 0), starterPiece(pieceId(), 'woods', 'Hollow copse', 25, 25, 8, 5, 3), starterPiece(pieceId(), 'objective', 'Signal cache', 16, 27, 2, 2, 4)] });
}
