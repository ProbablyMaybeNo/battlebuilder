import type { Piece, PieceKind } from '../document/schema';

export type TerrainGroup = 'Structures' | 'Linear terrain' | 'Natural terrain' | 'Tactical items';
export interface TerrainBounds { minWidth: number; minHeight: number; maxWidth: number; maxHeight: number; }
export interface CatalogItem { kind: PieceKind; name: string; singular: string; group: TerrainGroup; width: number; height: number; bounds: TerrainBounds; description: string; accessibleName: string; favourite: boolean; recent: boolean; }

const item = (entry: CatalogItem): CatalogItem => entry;
export const catalog: readonly CatalogItem[] = [
  item({ kind: 'building', name: 'Field building', singular: 'Building', group: 'Structures', width: 6, height: 4, bounds: { minWidth: 2, minHeight: 2, maxWidth: 36, maxHeight: 36 }, description: 'Inset exterior walls, roof or interior plan, and access marks.', accessibleName: 'Field building structure', favourite: true, recent: true }),
  item({ kind: 'ruin', name: 'Collapsed ruin', singular: 'Ruin', group: 'Structures', width: 5, height: 4, bounds: { minWidth: 2, minHeight: 2, maxWidth: 36, maxHeight: 36 }, description: 'Broken perimeter and exposed interior.', accessibleName: 'Collapsed ruin structure', favourite: true, recent: true }),
  item({ kind: 'platform', name: 'Raised platform', singular: 'Platform', group: 'Structures', width: 5, height: 3, bounds: { minWidth: 2, minHeight: 2, maxWidth: 30, maxHeight: 30 }, description: 'An elevated surface with a clear edge.', accessibleName: 'Raised platform structure', favourite: false, recent: false }),
  item({ kind: 'road', name: 'Service road', singular: 'Road', group: 'Linear terrain', width: 10, height: 2, bounds: { minWidth: 3, minHeight: 1, maxWidth: 72, maxHeight: 18 }, description: 'A restrained hard surface with lane edges.', accessibleName: 'Service road terrain', favourite: false, recent: true }),
  item({ kind: 'water', name: 'Shallow water', singular: 'Water', group: 'Linear terrain', width: 8, height: 3, bounds: { minWidth: 2, minHeight: 1, maxWidth: 72, maxHeight: 24 }, description: 'A readable watercourse with wave marks.', accessibleName: 'Shallow water terrain', favourite: false, recent: false }),
  item({ kind: 'wall', name: 'Barricade wall', singular: 'Wall', group: 'Linear terrain', width: 5, height: 1, bounds: { minWidth: 2, minHeight: 1, maxWidth: 72, maxHeight: 3 }, description: 'Low defensive barrier segments.', accessibleName: 'Barricade wall terrain', favourite: true, recent: false }),
  item({ kind: 'woods', name: 'Woods', singular: 'Woods', group: 'Natural terrain', width: 5, height: 4, bounds: { minWidth: 2, minHeight: 2, maxWidth: 36, maxHeight: 36 }, description: 'A restrained canopy and trunk pattern.', accessibleName: 'Woods terrain', favourite: true, recent: false }),
  item({ kind: 'rocks', name: 'Rock outcrop', singular: 'Rock outcrop', group: 'Natural terrain', width: 4, height: 3, bounds: { minWidth: 2, minHeight: 2, maxWidth: 24, maxHeight: 24 }, description: 'Angular cover formation.', accessibleName: 'Rock outcrop terrain', favourite: false, recent: false }),
  item({ kind: 'scatter', name: 'Scatter terrain', singular: 'Scatter', group: 'Natural terrain', width: 3, height: 2, bounds: { minWidth: 1, minHeight: 1, maxWidth: 18, maxHeight: 18 }, description: 'Crates, debris, and low cover.', accessibleName: 'Scatter terrain', favourite: false, recent: true }),
  item({ kind: 'objective', name: 'Objective', singular: 'Objective', group: 'Tactical items', width: 2, height: 2, bounds: { minWidth: 1, minHeight: 1, maxWidth: 4, maxHeight: 4 }, description: 'A named tactical point of interest.', accessibleName: 'Objective marker', favourite: true, recent: false }),
  item({ kind: 'token', name: 'Tactical token', singular: 'Token', group: 'Tactical items', width: 1, height: 1, bounds: { minWidth: 1, minHeight: 1, maxWidth: 3, maxHeight: 3 }, description: 'A compact circular planning token.', accessibleName: 'Tactical token', favourite: false, recent: false }),
  item({ kind: 'marker', name: 'Tactical marker', singular: 'Marker', group: 'Tactical items', width: 1, height: 1, bounds: { minWidth: 1, minHeight: 1, maxWidth: 3, maxHeight: 3 }, description: 'A high-legibility directional marker.', accessibleName: 'Tactical marker', favourite: false, recent: false }),
];

export const catalogByKind = (kind: PieceKind): CatalogItem => { const found = catalog.find((entry) => entry.kind === kind); if (!found) throw new Error(`Missing terrain catalog entry for ${kind}.`); return found; };
export const kindLabel = (kind: PieceKind) => catalogByKind(kind).singular;
export const accessiblePieceName = (piece: Piece) => `${piece.name}, ${catalogByKind(piece.kind).accessibleName}, ${piece.width} by ${piece.height} inches`;
/** Names remain stable after creation; this proposes a unique name for a new catalog item. */
export function nextTerrainName(kind: PieceKind, pieces: readonly Pick<Piece, 'name'>[]): string { const label = kindLabel(kind); const taken = new Set(pieces.map((piece) => piece.name.trim().toLocaleLowerCase())); if (!taken.has(label.toLocaleLowerCase())) return label; let serial = 2; while (taken.has(`${label} ${serial}`.toLocaleLowerCase())) serial += 1; return `${label} ${serial}`; }
