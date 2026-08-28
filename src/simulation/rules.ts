import type { BattlePhase, BattlePosition, BattleSession, BattleUnit, SerializableRandomState, SimulationTerrainFact } from './contracts';
import type { ElevationHook, GridPathResult, LineOfSightResult } from './spatial';

export type TacticalAction = 'move' | 'attack' | 'secure-objective';
export type ExplanationOutcome = 'legal' | 'illegal' | 'resolved';
export interface ExplanationItem { label: string; value: string; }
export interface RuleRollExplanation { label: string; minimum: number; maximum: number; result: number; target?: number; }
/** This data is the contract that B16 will render; B15 intentionally adds no Battle UI. */
export interface RuleExplanation {
  title: string;
  outcome: ExplanationOutcome;
  summary: string;
  inputs: readonly ExplanationItem[];
  assumptions: readonly string[];
  terrain: readonly string[];
  rolls: readonly RuleRollExplanation[];
}
export interface RuleResolution<T> { ok: boolean; value: T; explanation: RuleExplanation; }
export interface UnitProfile { id: string; label: string; movementInches: number; attackRangeInches: number; attackTarget: number; observerElevationInches: number; }
export interface TerrainEffect { terrainId: string; terrainName: string; movementBlocked: boolean; lineOfSightBlocked: boolean; grantsCover: boolean; elevationInches: number; heightInches: number; }
export interface MovementResolution { unitId: string; destination: BattlePosition; path: GridPathResult; }
export interface RangeResolution { from: BattlePosition; to: BattlePosition; distance: number; maximum: number; inRange: boolean; }
export interface CoverResolution { covered: boolean; terrain: readonly SimulationTerrainFact[]; }
export interface LineOfSightResolution { line: LineOfSightResult; }
export interface LegalTarget { unitId: string; legal: boolean; reason: string; range: RangeResolution | null; lineOfSight: LineOfSightResolution | null; cover: CoverResolution | null; }
export interface ObjectiveScoreResolution { objectiveId: string; factionId: string; points: number; controlled: boolean; }
export interface RollResolution { random: SerializableRandomState; result: number; success: boolean; target: number; }
export interface UnitContext { session: BattleSession; unitId: string; }
export interface MovementRequest extends UnitContext { destination: BattlePosition; }
export interface RangeRequest { from: BattlePosition; to: BattlePosition; maximum: number; }
export interface TerrainRequest { session: BattleSession; position: BattlePosition; }
export interface SightRequest { session: BattleSession; observerId: string; targetId: string; elevations?: ElevationHook; }
export interface ObjectiveRequest { session: BattleSession; factionId: string; objectiveId: string; }
export interface RollRequest { random: SerializableRandomState; minimum: number; maximum: number; target: number; label: string; }

export interface RulesAdapter {
  readonly id: string;
  readonly version: string;
  readonly label: string;
  readonly description: string;
  phases(): readonly BattlePhase[];
  profileFor(unit: BattleUnit, session: BattleSession): UnitProfile;
  legalActions(context: UnitContext): RuleResolution<readonly TacticalAction[]>;
  movement(request: MovementRequest): RuleResolution<MovementResolution>;
  range(request: RangeRequest): RuleResolution<RangeResolution>;
  terrainEffects(request: TerrainRequest): RuleResolution<readonly TerrainEffect[]>;
  cover(request: SightRequest): RuleResolution<CoverResolution>;
  lineOfSight(request: SightRequest): RuleResolution<LineOfSightResolution>;
  legalTargets(context: UnitContext): RuleResolution<readonly LegalTarget[]>;
  objectiveScoring(request: ObjectiveRequest): RuleResolution<ObjectiveScoreResolution>;
  resolveRoll(request: RollRequest): RuleResolution<RollResolution>;
}
