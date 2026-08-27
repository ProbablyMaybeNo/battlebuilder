import { createRectangleFootprint, createStructureDetails, isStructureKind, type AccessFeature, type BoardDocument, type Piece, type PieceKind, type WallSide } from '../document/schema';
import { catalogByKind, nextTerrainName } from './catalog';

export type PlacementIssue = 'off-board' | 'collision' | 'locked' | 'hidden' | 'size';
export type PlacementResult = { ok: true } | { ok: false; reason: PlacementIssue };
export type JoinResult = { ok: true; piece: Piece; consumedIds: string[] } | { ok: false; reason: 'selection' | 'type' | 'locked' | 'rotation' | 'overlap' | 'gap' | 'outline' };

const same = (a: Piece, b: Piece) => a.id === b.id;
const cellKey = (x: number, y: number) => `${x},${y}`;
const whole = (value: number) => Math.max(1, Math.round(value));
export const normalizeRotation = (rotation: number) => ((Math.round(rotation) % 360) + 360) % 360;
export const rectsOverlap = (a: Pick<Piece, 'x' | 'y' | 'width' | 'height'>, b: Pick<Piece, 'x' | 'y' | 'width' | 'height'>) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

export function placementResult(board: BoardDocument, candidate: Piece, excludedIds: readonly string[] = []): PlacementResult {
  const { widthInches, heightInches } = board.settings;
  const bounds = catalogByKind(candidate.kind).bounds;
  if (candidate.width < bounds.minWidth || candidate.height < bounds.minHeight || candidate.width > bounds.maxWidth || candidate.height > bounds.maxHeight) return { ok: false, reason: 'size' };
  if (candidate.x < 0 || candidate.y < 0 || candidate.x + candidate.width > widthInches || candidate.y + candidate.height > heightInches) return { ok: false, reason: 'off-board' };
  const blocked = board.pieces.filter((piece) => !excludedIds.includes(piece.id) && !piece.hidden && !same(piece, candidate)).find((piece) => rectsOverlap(piece, candidate));
  return blocked ? { ok: false, reason: 'collision' } : { ok: true };
}

function accessThatStillFits(features: readonly AccessFeature[], width: number, height: number): AccessFeature[] {
  const kept: AccessFeature[] = [];
  for (const feature of features) {
    const length = feature.wall === 'north' || feature.wall === 'south' ? width : height;
    if (feature.offset < length) {
      const next = { ...feature, span: Math.min(feature.span, length - feature.offset) };
      const overlaps = kept.some((other) => other.wall === next.wall && other.offset < next.offset + next.span && next.offset < other.offset + other.span);
      if (!overlaps && next.span > 0) kept.push(next);
    }
  }
  return kept;
}

/** Keeps structure geometry and attached grid features coherent after a transform. */
export function resizePiece(piece: Piece, width: number, height: number): Piece {
  const nextWidth = whole(width); const nextHeight = whole(height);
  if (!piece.structureDetails) return { ...piece, width: nextWidth, height: nextHeight };
  const details = piece.structureDetails;
  return { ...piece, width: nextWidth, height: nextHeight, structureDetails: { ...details, footprint: createRectangleFootprint(nextWidth, nextHeight), doors: accessThatStillFits(details.doors, nextWidth, nextHeight), windows: accessThatStillFits(details.windows, nextWidth, nextHeight) } };
}

export function createPiece(board: BoardDocument, kind: PieceKind, x: number, y: number, width?: number, height?: number): Piece {
  const item = catalogByKind(kind); const pieceWidth = whole(width ?? item.width); const pieceHeight = whole(height ?? item.height);
  return { id: crypto.randomUUID(), kind, name: nextTerrainName(kind, board.pieces), x: Math.round(x), y: Math.round(y), width: pieceWidth, height: pieceHeight, rotation: 0, locked: false, hidden: false, layer: Math.max(0, ...board.pieces.map((piece) => piece.layer)) + 1, notes: '', ...(isStructureKind(kind) ? { structureDetails: createStructureDetails(pieceWidth, pieceHeight) } : {}) };
}

export function movePieces(board: BoardDocument, ids: readonly string[], dx: number, dy: number): { pieces: Piece[]; result: PlacementResult } {
  const selected = new Set(ids); const moved = board.pieces.filter((piece) => selected.has(piece.id));
  if (!moved.length || moved.some((piece) => piece.locked)) return { pieces: board.pieces, result: { ok: false, reason: 'locked' } };
  const candidates = moved.map((piece) => ({ ...piece, x: Math.round(piece.x + dx), y: Math.round(piece.y + dy) }));
  for (const candidate of candidates) {
    const result = placementResult(board, candidate, ids);
    if (!result.ok) return { pieces: board.pieces, result };
  }
  return { pieces: board.pieces.map((piece) => candidates.find((candidate) => candidate.id === piece.id) ?? piece), result: { ok: true } };
}

export function addAccess(piece: Piece, type: 'door' | 'window', wall: WallSide, offset: number, span = 1): Piece | null {
  if (!piece.structureDetails || piece.kind === 'platform') return null;
  const length = wall === 'north' || wall === 'south' ? piece.width : piece.height;
  const next: AccessFeature = { id: crypto.randomUUID(), wall, offset: Math.max(0, Math.min(length - 1, Math.round(offset))), span: Math.max(1, Math.min(Math.round(span), length)) };
  if (next.offset + next.span > length) next.span = length - next.offset;
  const all = [...piece.structureDetails.doors, ...piece.structureDetails.windows];
  if (all.some((feature) => feature.wall === next.wall && feature.offset < next.offset + next.span && next.offset < feature.offset + feature.span)) return null;
  return { ...piece, structureDetails: { ...piece.structureDetails, [type === 'door' ? 'doors' : 'windows']: [...piece.structureDetails[type === 'door' ? 'doors' : 'windows'], next] } };
}

export function removeAccess(piece: Piece, id: string): Piece {
  if (!piece.structureDetails) return piece;
  return { ...piece, structureDetails: { ...piece.structureDetails, doors: piece.structureDetails.doors.filter((feature) => feature.id !== id), windows: piece.structureDetails.windows.filter((feature) => feature.id !== id) } };
}

const structureCells = (piece: Piece) => {
  if (!piece.structureDetails || piece.rotation !== 0) return [] as Array<{ x: number; y: number }>;
  const footprint = piece.structureDetails.footprint;
  if (footprint.kind !== 'cells') return [];
  return footprint.cells.map((cell) => ({ x: cell.x + piece.x, y: cell.y + piece.y }));
};
const connected = (cells: readonly { x: number; y: number }[]) => {
  if (!cells.length) return false; const all = new Set(cells.map((cell) => cellKey(cell.x, cell.y))); const seen = new Set<string>([cellKey(cells[0].x, cells[0].y)]); const queue = [cells[0]];
  while (queue.length) { const current = queue.shift()!; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const key = cellKey(current.x + dx, current.y + dy); if (all.has(key) && !seen.has(key)) { seen.add(key); queue.push({ x: current.x + dx, y: current.y + dy }); } } }
  return seen.size === all.size;
};

function remapAccess(source: Piece, feature: AccessFeature, minX: number, minY: number, maxX: number, maxY: number): AccessFeature | null {
  if (feature.wall === 'north' && source.y === minY) return { ...feature, offset: source.x - minX + feature.offset };
  if (feature.wall === 'south' && source.y + source.height === maxY) return { ...feature, offset: source.x - minX + feature.offset };
  if (feature.wall === 'west' && source.x === minX) return { ...feature, offset: source.y - minY + feature.offset };
  if (feature.wall === 'east' && source.x + source.width === maxX) return { ...feature, offset: source.y - minY + feature.offset };
  return null;
}

export function joinStructures(board: BoardDocument, ids: readonly string[]): JoinResult {
  const selected = board.pieces.filter((piece) => ids.includes(piece.id));
  if (selected.length < 2) return { ok: false, reason: 'selection' };
  if (selected.some((piece) => !isStructureKind(piece.kind)) || new Set(selected.map((piece) => piece.kind)).size !== 1) return { ok: false, reason: 'type' };
  if (selected.some((piece) => piece.locked)) return { ok: false, reason: 'locked' };
  if (selected.some((piece) => piece.rotation !== 0)) return { ok: false, reason: 'rotation' };
  const cells = selected.flatMap(structureCells); const keys = new Set(cells.map((cell) => cellKey(cell.x, cell.y)));
  if (keys.size !== cells.length) return { ok: false, reason: 'overlap' };
  if (!connected(cells)) return { ok: false, reason: 'gap' };
  const minX = Math.min(...cells.map((cell) => cell.x)); const minY = Math.min(...cells.map((cell) => cell.y)); const maxX = Math.max(...cells.map((cell) => cell.x)) + 1; const maxY = Math.max(...cells.map((cell) => cell.y)) + 1;
  const kind = selected[0].kind; const existing = board.pieces.filter((piece) => !ids.includes(piece.id));
  const details = selected[0].structureDetails!;
  const attachments = (type: 'doors' | 'windows') => selected.flatMap((piece) => piece.structureDetails![type].map((feature) => remapAccess(piece, feature, minX, minY, maxX, maxY))).filter((feature): feature is AccessFeature => feature !== null);
  const piece: Piece = { ...selected[0], id: crypto.randomUUID(), name: nextTerrainName(kind, existing), x: minX, y: minY, width: maxX - minX, height: maxY - minY, layer: Math.max(...selected.map((entry) => entry.layer)), structureDetails: { ...details, footprint: { kind: 'cells', cells: cells.map((cell) => ({ x: cell.x - minX, y: cell.y - minY })) }, doors: accessThatStillFits(attachments('doors'), maxX - minX, maxY - minY), windows: accessThatStillFits(attachments('windows'), maxX - minX, maxY - minY) } };
  return { ok: true, piece, consumedIds: selected.map((entry) => entry.id) };
}
