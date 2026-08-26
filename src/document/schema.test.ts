import { describe, expect, it } from 'vitest';
import {
  DEFAULT_BOARD_SIZE_INCHES,
  MAX_BOARD_SIZE_INCHES,
  createRectangleFootprint,
  createStructureDetails,
  newBoard,
  parseBoard,
  starterBoard,
  validateImport,
  type BoardDocument,
  type Piece,
} from './schema';

const now = () => new Date('2026-08-26T12:00:00.000Z');
const newId = () => 'board-id';

const building = (overrides: Partial<Piece> = {}): Piece => ({
  id: 'building-1',
  kind: 'building',
  name: 'Command post',
  x: 4,
  y: 4,
  width: 6,
  height: 4,
  rotation: 0,
  locked: false,
  hidden: false,
  layer: 0,
  notes: '',
  structureDetails: {
    ...createStructureDetails(6, 4),
    doors: [{ id: 'door-1', wall: 'north', offset: 2, span: 1 }],
    windows: [{ id: 'window-1', wall: 'east', offset: 1, span: 1 }],
  },
  ...overrides,
});

const boardWith = (piece: Piece): BoardDocument => ({ ...newBoard({ now, idFactory: newId }), pieces: [piece] });

describe('board document schema', () => {
  it('creates a renderer-neutral 36 by 36 one-inch default board', () => {
    const board = newBoard({ now, idFactory: newId });
    expect(board.settings.widthInches).toBe(DEFAULT_BOARD_SIZE_INCHES);
    expect(board.settings.heightInches).toBe(DEFAULT_BOARD_SIZE_INCHES);
    expect(board.settings).not.toHaveProperty('grid');
    expect(parseBoard(board)).toEqual(board);
  });

  it('enforces whole-inch board dimensions from 12 through 72', () => {
    expect(() => newBoard({ now, idFactory: newId, settings: { widthInches: 73 } })).toThrow(/between 12 and 72/);
    expect(() => newBoard({ now, idFactory: newId, settings: { heightInches: 11 } })).toThrow(/between 12 and 72/);
    expect(() => newBoard({ now, idFactory: newId, settings: { widthInches: 36.5 } })).toThrow(/integer/);
    expect(MAX_BOARD_SIZE_INCHES).toBe(72);
  });

  it('rejects configurable grid settings and out-of-board terrain', () => {
    const gridBoard = { ...newBoard({ now, idFactory: newId }), settings: { ...newBoard({ now, idFactory: newId }).settings, grid: 2 } };
    expect(() => parseBoard(gridBoard)).toThrow(/fixed at one inch/);
    expect(() => parseBoard(boardWith(building({ x: 32, width: 6 })))).toThrow(/fit within the board/);
  });

  it('parses cell footprints, exterior doors, and windows', () => {
    const parsed = parseBoard(boardWith(building()));
    expect(parsed.pieces[0].structureDetails?.footprint).toEqual(createRectangleFootprint(6, 4));
    expect(parsed.pieces[0].structureDetails?.doors[0].wall).toBe('north');
    expect(parsed.pieces[0].structureDetails?.windows[0].wall).toBe('east');
  });

  it('rejects duplicate cells, invalid access boundaries, and overlapping access', () => {
    const duplicateCells = building({ structureDetails: { ...createStructureDetails(6, 4), footprint: { kind: 'cells', cells: [{ x: 0, y: 0 }, { x: 0, y: 0 }] } } });
    expect(() => parseBoard(boardWith(duplicateCells))).toThrow(/duplicate cell/);

    const invalidDoor = building({ structureDetails: { ...createStructureDetails(6, 4), doors: [{ id: 'door-1', wall: 'north', offset: 6, span: 1 }] } });
    expect(() => parseBoard(boardWith(invalidDoor))).toThrow(/beyond/);

    const overlap = building({ structureDetails: { ...createStructureDetails(6, 4), doors: [{ id: 'door-1', wall: 'south', offset: 1, span: 2 }], windows: [{ id: 'window-1', wall: 'south', offset: 2, span: 2 }] } });
    expect(() => parseBoard(boardWith(overlap))).toThrow(/cannot overlap/);
  });

  it('accepts a simple polygon footprint but prevents access on it and rejects self intersections', () => {
    const polygon = building({ structureDetails: { ...createStructureDetails(6, 4), footprint: { kind: 'polygon', points: [{ x: 0, y: 0 }, { x: 6, y: 0 }, { x: 6, y: 4 }, { x: 0, y: 4 }] }, doors: [], windows: [] } });
    expect(parseBoard(boardWith(polygon)).pieces[0].structureDetails?.footprint.kind).toBe('polygon');
    const withDoor = { ...polygon, structureDetails: { ...polygon.structureDetails!, doors: [{ id: 'door-1', wall: 'north' as const, offset: 0, span: 1 }] } };
    expect(() => parseBoard(boardWith(withDoor))).toThrow(/polygon footprints cannot carry/);
    const selfCrossing = { ...polygon, structureDetails: { ...polygon.structureDetails!, footprint: { kind: 'polygon' as const, points: [{ x: 0, y: 0 }, { x: 6, y: 4 }, { x: 6, y: 0 }, { x: 0, y: 4 }] } } };
    expect(() => parseBoard(boardWith(selfCrossing))).toThrow(/cannot self-intersect/);
  });

  it('rejects duplicate IDs, non-finite values, missing structure details, and bad timestamps', () => {
    const board = boardWith(building());
    expect(() => parseBoard({ ...board, pieces: [board.pieces[0], { ...board.pieces[0] }] })).toThrow(/duplicate piece IDs/);
    expect(() => parseBoard(boardWith(building({ rotation: Number.NaN })))).toThrow(/finite number/);
    expect(() => parseBoard(boardWith({ ...building(), structureDetails: undefined }))).toThrow(/structure details/);
    expect(() => parseBoard({ ...board, updatedAt: 'not-a-date' })).toThrow(/valid ISO/);
  });

  it('validates imports without throwing and keeps a valid starter layout in bounds', () => {
    expect(validateImport('{broken').ok).toBe(false);
    const starter = starterBoard({ now, idFactory: () => 'starter' });
    expect(validateImport(JSON.stringify(starter))).toMatchObject({ ok: true });
  });
});
