import type { BoardDocument, Piece } from '../document/schema';
import type { SimulationTerrainFact, TerrainAccessFact } from './contracts';

const terrainAccess = (piece: Piece): readonly TerrainAccessFact[] => {
  const details = piece.structureDetails;
  if (!details) return [];
  return [
    ...details.doors.map((feature) => ({ ...feature, kind: 'door' as const })),
    ...details.windows.map((feature) => ({ ...feature, kind: 'window' as const })),
  ].sort((left, right) => left.id.localeCompare(right.id));
};

/** Immutable simulation facts derived from the signed-off board contract. */
export function terrainFactsFromBoard(board: BoardDocument): readonly SimulationTerrainFact[] {
  return board.pieces.map((piece) => ({
    sourcePieceId: piece.id,
    kind: piece.kind,
    name: piece.name,
    x: piece.x,
    y: piece.y,
    width: piece.width,
    height: piece.height,
    rotation: piece.rotation,
    elevationInches: piece.structureDetails?.elevationInches ?? 0,
    heightInches: piece.structureDetails?.heightInches ?? 0,
    access: terrainAccess(piece),
  }));
}
