import type { PieceKind } from '../document/schema';
export interface CatalogItem { kind: PieceKind; name: string; group: string; width: number; height: number; description: string; }
export const catalog: CatalogItem[] = [
  { kind: 'building', name: 'Field building', group: 'Structures', width: 6, height: 4, description: 'Footprint with walls, doors and roof plan.' },
  { kind: 'ruin', name: 'Collapsed ruin', group: 'Structures', width: 5, height: 4, description: 'Broken walls and exposed interior.' },
  { kind: 'platform', name: 'Raised platform', group: 'Structures', width: 5, height: 3, description: 'Elevated tactical surface.' },
  { kind: 'road', name: 'Service road', group: 'Linear terrain', width: 10, height: 2, description: 'A quiet, readable hard surface.' },
  { kind: 'water', name: 'Shallow water', group: 'Linear terrain', width: 8, height: 3, description: 'Cross-hatched watercourse.' },
  { kind: 'wall', name: 'Barricade wall', group: 'Linear terrain', width: 5, height: 1, description: 'Low defensive wall.' },
  { kind: 'woods', name: 'Woods', group: 'Natural terrain', width: 5, height: 4, description: 'Restrained tree symbols.' },
  { kind: 'rocks', name: 'Rock outcrop', group: 'Natural terrain', width: 4, height: 3, description: 'Angular cover formation.' },
  { kind: 'scatter', name: 'Scatter terrain', group: 'Natural terrain', width: 3, height: 2, description: 'Crates, debris, and cover.' },
  { kind: 'objective', name: 'Objective', group: 'Markers', width: 2, height: 2, description: 'Named point of interest.' },
  { kind: 'marker', name: 'Tactical marker', group: 'Markers', width: 1, height: 1, description: 'A compact planning marker.' }
];
export const kindLabel = (kind: PieceKind) => catalog.find(item => item.kind === kind)?.name ?? kind;
