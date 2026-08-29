import type { Piece, PieceKind } from '../document/schema';

export type TerrainGroup = 'Structures' | 'Linear terrain' | 'Natural terrain' | 'Tactical items';
export interface TerrainBounds { minWidth: number; minHeight: number; maxWidth: number; maxHeight: number; }
export interface CatalogItem { kind: PieceKind; name: string; singular: string; group: TerrainGroup; width: number; height: number; bounds: TerrainBounds; description: string; accessibleName: string; }

const item = (entry: CatalogItem): CatalogItem => entry;
export const catalog: readonly CatalogItem[] = [
  item({ kind: 'building', name: 'Building', singular: 'Building', group: 'Structures', width: 6, height: 4, bounds: { minWidth: 2, minHeight: 2, maxWidth: 36, maxHeight: 36 }, description: 'Neon-cyan walls, roof or interior plan, and access marks.', accessibleName: 'Building structure' }),
  item({ kind: 'ruin', name: 'Ruin', singular: 'Ruin', group: 'Structures', width: 5, height: 4, bounds: { minWidth: 2, minHeight: 2, maxWidth: 36, maxHeight: 36 }, description: 'Broken perimeter and exposed interior.', accessibleName: 'Ruin structure' }),
  item({ kind: 'platform', name: 'Raised platform', singular: 'Platform', group: 'Structures', width: 5, height: 3, bounds: { minWidth: 2, minHeight: 2, maxWidth: 30, maxHeight: 30 }, description: 'An elevated surface with a clear edge.', accessibleName: 'Raised platform structure' }),
  item({ kind: 'road', name: 'Road', singular: 'Road', group: 'Linear terrain', width: 10, height: 2, bounds: { minWidth: 3, minHeight: 1, maxWidth: 72, maxHeight: 18 }, description: 'A clear paved route with lane edges.', accessibleName: 'Road terrain' }),
  item({ kind: 'water', name: 'Water', singular: 'Water', group: 'Linear terrain', width: 8, height: 3, bounds: { minWidth: 2, minHeight: 1, maxWidth: 72, maxHeight: 24 }, description: 'A readable watercourse with wave marks.', accessibleName: 'Water terrain' }),
  item({ kind: 'wall', name: 'Wall', singular: 'Wall', group: 'Linear terrain', width: 5, height: 1, bounds: { minWidth: 2, minHeight: 1, maxWidth: 72, maxHeight: 3 }, description: 'Low defensive barrier segments.', accessibleName: 'Wall terrain' }),
  item({ kind: 'woods', name: 'Woods', singular: 'Woods', group: 'Natural terrain', width: 5, height: 4, bounds: { minWidth: 2, minHeight: 2, maxWidth: 36, maxHeight: 36 }, description: 'Neon-green organic canopy and trunks.', accessibleName: 'Woods terrain' }),
  item({ kind: 'rocks', name: 'Rocks', singular: 'Rock outcrop', group: 'Natural terrain', width: 4, height: 3, bounds: { minWidth: 2, minHeight: 2, maxWidth: 24, maxHeight: 24 }, description: 'Angular cover formation.', accessibleName: 'Rock outcrop terrain' }),
  item({ kind: 'scatter', name: 'Scatter terrain', singular: 'Scatter', group: 'Natural terrain', width: 3, height: 2, bounds: { minWidth: 1, minHeight: 1, maxWidth: 18, maxHeight: 18 }, description: 'Crates, debris, and low cover.', accessibleName: 'Scatter terrain' }),
  item({ kind: 'objective', name: 'Objective', singular: 'Objective', group: 'Tactical items', width: 2, height: 2, bounds: { minWidth: 1, minHeight: 1, maxWidth: 4, maxHeight: 4 }, description: 'A named tactical point of interest.', accessibleName: 'Objective marker' }),
  item({ kind: 'token', name: 'Tactical token', singular: 'Token', group: 'Tactical items', width: 1, height: 1, bounds: { minWidth: 1, minHeight: 1, maxWidth: 3, maxHeight: 3 }, description: 'A compact circular planning token.', accessibleName: 'Tactical token' }),
  item({ kind: 'marker', name: 'Tactical marker', singular: 'Marker', group: 'Tactical items', width: 1, height: 1, bounds: { minWidth: 1, minHeight: 1, maxWidth: 3, maxHeight: 3 }, description: 'A high-legibility directional marker.', accessibleName: 'Tactical marker' }),
];

export const catalogByKind = (kind: PieceKind): CatalogItem => { const found = catalog.find((entry) => entry.kind === kind); if (!found) throw new Error(`Missing terrain catalog entry for ${kind}.`); return found; };
export const kindLabel = (kind: PieceKind) => catalogByKind(kind).singular;
export const accessiblePieceName = (piece: Piece) => `${piece.name}, ${catalogByKind(piece.kind).accessibleName}, ${piece.width} by ${piece.height} inches`;
/** Names remain stable after creation; this proposes a unique name for a new catalog item. */
export function nextTerrainName(kind: PieceKind, pieces: readonly Pick<Piece, 'name'>[]): string { const label = kindLabel(kind); const taken = new Set(pieces.map((piece) => piece.name.trim().toLocaleLowerCase())); if (!taken.has(label.toLocaleLowerCase())) return label; let serial = 2; while (taken.has(`${label} ${serial}`.toLocaleLowerCase())) serial += 1; return `${label} ${serial}`; }
