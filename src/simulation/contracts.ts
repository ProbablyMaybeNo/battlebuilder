import type { BoardDocument, PieceKind } from '../document/schema';

export const BATTLE_SESSION_VERSION = 1 as const;
export const BATTLE_ENGINE_VERSION = '1' as const;
export const RANDOM_ALGORITHM = 'mulberry32-v1' as const;

export type BattlePhase = 'setup' | 'deployment' | 'command' | 'resolution' | 'complete';
export type TerrainAccessKind = 'door' | 'window';

export interface BattleAdapterReference { id: string; version: string; }
export interface BattleFaction { id: string; name: string; }
export interface BattlePosition { x: number; y: number; }
export interface BattleUnit { id: string; factionId: string; name: string; position: BattlePosition | null; }
export interface BattleObjective { id: string; sourcePieceId: string | null; state: string; }
export interface TerrainAccessFact { id: string; kind: TerrainAccessKind; wall: 'north' | 'east' | 'south' | 'west'; offset: number; span: number; }
export interface SimulationTerrainFact {
  sourcePieceId: string;
  kind: PieceKind;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  elevationInches: number;
  heightInches: number;
  access: readonly TerrainAccessFact[];
}
export interface BattleBoardSnapshot {
  boardId: string;
  boardVersion: number;
  snapshot: BoardDocument;
}
export interface SerializableRandomState { algorithm: typeof RANDOM_ALGORITHM; seed: string; state: number; }
export interface BattleTurnState { round: number; phase: BattlePhase; activeFactionId: string | null; moveIntent: { unitId: string; destination: BattlePosition } | null; }

export interface SessionCreateCommand {
  type: 'session.create';
  id: string;
  at: string;
  sessionId: string;
  name: string;
  board: BoardDocument;
  seed: string;
  adapter: BattleAdapterReference;
  factions: readonly BattleFaction[];
  units: readonly BattleUnit[];
  objectives: readonly BattleObjective[];
}
export interface UnitDeployCommand { type: 'unit.deploy'; id: string; at: string; unitId: string; position: BattlePosition; }
export interface PhaseChangeCommand { type: 'phase.change'; id: string; at: string; phase: BattlePhase; activeFactionId: string | null; round: number; }
export interface MoveIntentCommand { type: 'move.intent'; id: string; at: string; unitId: string; destination: BattlePosition; }
export interface RollRequestCommand { type: 'roll.request'; id: string; at: string; rollId: string; minimum: number; maximum: number; }
export interface ObjectiveStateCommand { type: 'objective.state'; id: string; at: string; objectiveId: string; state: string; }
export interface LogAppendCommand { type: 'log.append'; id: string; at: string; message: string; }
export type BattleCommand = SessionCreateCommand | UnitDeployCommand | PhaseChangeCommand | MoveIntentCommand | RollRequestCommand | ObjectiveStateCommand | LogAppendCommand;
export type ReplayCommand = Exclude<BattleCommand, SessionCreateCommand>;

export interface SessionCreatedEvent { sequence: number; type: 'session.created'; commandId: string; at: string; sessionId: string; }
export interface UnitDeployedEvent { sequence: number; type: 'unit.deployed'; commandId: string; at: string; unitId: string; position: BattlePosition; }
export interface PhaseChangedEvent { sequence: number; type: 'phase.changed'; commandId: string; at: string; phase: BattlePhase; activeFactionId: string | null; round: number; }
export interface MoveIntentEvent { sequence: number; type: 'move.intent.recorded'; commandId: string; at: string; unitId: string; destination: BattlePosition; }
export interface RollRequestedEvent { sequence: number; type: 'roll.requested'; commandId: string; at: string; rollId: string; minimum: number; maximum: number; }
export interface RollResolvedEvent { sequence: number; type: 'roll.resolved'; commandId: string; at: string; rollId: string; minimum: number; maximum: number; result: number; }
export interface ObjectiveStateChangedEvent { sequence: number; type: 'objective.state.changed'; commandId: string; at: string; objectiveId: string; state: string; }
export interface LogAppendedEvent { sequence: number; type: 'log.appended'; commandId: string; at: string; message: string; }
export type BattleEvent = SessionCreatedEvent | UnitDeployedEvent | PhaseChangedEvent | MoveIntentEvent | RollRequestedEvent | RollResolvedEvent | ObjectiveStateChangedEvent | LogAppendedEvent;

export interface BattleReplay { engineVersion: typeof BATTLE_ENGINE_VERSION; createdWith: SessionCreateCommand; commands: readonly ReplayCommand[]; }
export interface BattleSession {
  version: typeof BATTLE_SESSION_VERSION;
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  board: BattleBoardSnapshot;
  terrain: readonly SimulationTerrainFact[];
  seed: string;
  random: SerializableRandomState;
  adapter: BattleAdapterReference;
  factions: readonly BattleFaction[];
  units: readonly BattleUnit[];
  objectives: readonly BattleObjective[];
  turn: BattleTurnState;
  events: readonly BattleEvent[];
  replay: BattleReplay;
}
