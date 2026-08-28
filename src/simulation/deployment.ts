import type { BattlePosition, BattleSession } from './contracts';

export interface DeploymentZone { id: string; factionId: string; x: number; y: number; width: number; height: number; label: string; }
export type DeploymentValidation = { ok: true; zone: DeploymentZone } | { ok: false; reason: string };

/** Generic B14 deployment constraints; game-system legality belongs to B15 adapters. */
export function deploymentZones(session: BattleSession): readonly DeploymentZone[] {
  const { widthInches: width, heightInches: height } = session.board.snapshot.settings;
  const depth = Math.max(4, Math.floor(width / 6));
  return session.factions.map((faction, index) => ({ id: `zone-${faction.id}`, factionId: faction.id, y: 0, height, width: depth, x: index % 2 === 0 ? 0 : width - depth, label: `${faction.name} deployment zone` }));
}

const contains = (zone: DeploymentZone, position: BattlePosition) => position.x >= zone.x && position.x < zone.x + zone.width && position.y >= zone.y && position.y < zone.y + zone.height;
const blocksDeployment = (session: BattleSession, position: BattlePosition) => session.terrain.some((terrain) => ['building', 'ruin', 'wall'].includes(terrain.kind) && position.x >= terrain.x && position.x < terrain.x + terrain.width && position.y >= terrain.y && position.y < terrain.y + terrain.height);

export function validateDeployment(session: BattleSession, unitId: string, position: BattlePosition): DeploymentValidation {
  const unit = session.units.find((entry) => entry.id === unitId);
  if (!unit) return { ok: false, reason: 'Choose a roster unit first.' };
  const { widthInches, heightInches } = session.board.snapshot.settings;
  if (position.x < 0 || position.y < 0 || position.x >= widthInches || position.y >= heightInches) return { ok: false, reason: 'Deployment must stay within the board bounds.' };
  const zone = deploymentZones(session).find((entry) => entry.factionId === unit.factionId && contains(entry, position));
  if (!zone) return { ok: false, reason: 'Deployment must be inside this faction’s marked zone.' };
  if (session.units.some((entry) => entry.id !== unitId && entry.position?.x === position.x && entry.position?.y === position.y)) return { ok: false, reason: 'That grid cell is already occupied by another unit.' };
  if (blocksDeployment(session, position)) return { ok: false, reason: 'That grid cell is occupied by blocking terrain.' };
  return { ok: true, zone };
}
