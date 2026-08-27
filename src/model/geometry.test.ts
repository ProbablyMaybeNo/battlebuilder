import { describe, expect, it } from 'vitest';
import { newBoard, starterBoard } from '../document/schema';
import { catalog, nextTerrainName } from './catalog';
import { layoutTerrainLabels, terrainGeometry, terrainState } from './geometry';

describe('shared tactical terrain geometry', () => {
  const board = starterBoard({ idFactory: () => 'terrain-test', now: () => new Date('2026-08-26T00:00:00.000Z') });
  it('provides every supported terrain kind through the catalog', () => {
    expect(new Set(catalog.map((item) => item.kind))).toEqual(new Set(['building', 'ruin', 'platform', 'road', 'water', 'wall', 'woods', 'rocks', 'scatter', 'objective', 'token', 'marker']));
  });
  it('produces cartographic and 3D geometry for each starter piece', () => {
    for (const piece of board.pieces) { const geometry = terrainGeometry(piece); expect(geometry.svgSymbol).toBeTruthy(); expect(geometry.mesh.length).toBeGreaterThan(0); }
  });
  it('prioritizes selected or hovered labels and retains quiet labels when possible', () => {
    const labels = layoutTerrainLabels(board.pieces, [board.pieces[0].id], board.pieces[1].id);
    expect(labels.find((label) => label.id === board.pieces[0].id)?.detail).toBe(true);
    expect(labels.find((label) => label.id === board.pieces[1].id)?.detail).toBe(true);
  });
  it('uses distinct tactical states and produces stable unique terrain names', () => {
    const piece = board.pieces[0];
    expect(terrainState(piece, [piece.id], null)).toBe('selected');
    expect(terrainState({ ...piece, locked: true }, [], null)).toBe('locked');
    expect(nextTerrainName('building', [{ name: 'Building' }, { name: 'Building 2' }])).toBe('Building 3');
    expect(newBoard({ idFactory: () => 'new', now: () => new Date('2026-08-26T00:00:00.000Z') }).settings.widthInches).toBe(36);
  });
});
