import { parseBoard, type BoardDocument } from '../document/schema';
import {
  BATTLE_ENGINE_VERSION,
  BATTLE_SESSION_VERSION,
  RANDOM_ALGORITHM,
  type BattleAdapterReference,
  type BattleCommand,
  type BattleEvent,
  type BattleFaction,
  type BattleObjective,
  type BattlePhase,
  type BattlePosition,
  type BattleReplay,
  type BattleSession,
  type BattleTurnState,
  type BattleUnit,
  type ReplayCommand,
  type SerializableRandomState,
  type SessionCreateCommand,
} from './contracts';
import { migrateBattleSession } from './migrations';
import { createRandomState, validateRandomState } from './prng';
import { terrainFactsFromBoard } from './terrain';

type UnknownRecord = Record<string, unknown>;
const phases = new Set<BattlePhase>(['setup', 'deployment', 'command', 'resolution', 'complete']);
const isRecord = (value: unknown): value is UnknownRecord => typeof value === 'object' && value !== null && !Array.isArray(value);
const record = (value: unknown, label: string): UnknownRecord => { if (!isRecord(value)) throw new BattleSessionValidationError(`${label} must be an object.`); return value; };
const text = (value: unknown, label: string, maximum: number, blank = false): string => { if (typeof value !== 'string' || value.length > maximum || (!blank && !value.trim())) throw new BattleSessionValidationError(`${label} must be ${blank ? 'text' : 'non-empty text'} up to ${maximum} characters.`); return value; };
const integer = (value: unknown, label: string, minimum: number, maximum: number): number => { if (typeof value !== 'number' || !Number.isInteger(value) || value < minimum || value > maximum) throw new BattleSessionValidationError(`${label} must be an integer between ${minimum} and ${maximum}.`); return value; };
const timestamp = (value: unknown, label: string) => { const result = text(value, label, 64); if (!Number.isFinite(Date.parse(result))) throw new BattleSessionValidationError(`${label} must be a valid ISO timestamp.`); return result; };
const array = (value: unknown, label: string): unknown[] => { if (!Array.isArray(value)) throw new BattleSessionValidationError(`${label} must be an array.`); return value; };
const unique = (values: readonly { id: string }[], label: string) => { if (new Set(values.map((value) => value.id)).size !== values.length) throw new BattleSessionValidationError(`${label} must have unique IDs.`); };

export class BattleSessionValidationError extends Error { constructor(message: string) { super(message); this.name = 'BattleSessionValidationError'; } }

const parsePosition = (value: unknown, label: string): BattlePosition => { const raw = record(value, label); return { x: integer(raw.x, `${label} x`, 0, 72), y: integer(raw.y, `${label} y`, 0, 72) }; };
const parseAdapter = (value: unknown): BattleAdapterReference => { const raw = record(value, 'Battle adapter'); return { id: text(raw.id, 'Battle adapter id', 80), version: text(raw.version, 'Battle adapter version', 40) }; };
const parseFaction = (value: unknown, index: number): BattleFaction => { const raw = record(value, `Faction ${index + 1}`); return { id: text(raw.id, `Faction ${index + 1} id`, 80), name: text(raw.name, `Faction ${index + 1} name`, 120) }; };
const parseUnit = (value: unknown, index: number): BattleUnit => { const raw = record(value, `Unit ${index + 1}`); return { id: text(raw.id, `Unit ${index + 1} id`, 80), factionId: text(raw.factionId, `Unit ${index + 1} faction id`, 80), name: text(raw.name, `Unit ${index + 1} name`, 120), position: raw.position === null ? null : parsePosition(raw.position, `Unit ${index + 1} position`) }; };
const parseObjective = (value: unknown, index: number): BattleObjective => { const raw = record(value, `Objective ${index + 1}`); return { id: text(raw.id, `Objective ${index + 1} id`, 80), sourcePieceId: raw.sourcePieceId === null ? null : text(raw.sourcePieceId, `Objective ${index + 1} source piece id`, 80), state: text(raw.state, `Objective ${index + 1} state`, 80, true) }; };
const parseFactions = (value: unknown) => { const factions = array(value, 'Factions').map(parseFaction); unique(factions, 'Factions'); return factions; };
const parseUnits = (value: unknown, factions: readonly BattleFaction[]) => { const units = array(value, 'Units').map(parseUnit); unique(units, 'Units'); const factionIds = new Set(factions.map((faction) => faction.id)); if (units.some((unit) => !factionIds.has(unit.factionId))) throw new BattleSessionValidationError('Every unit must reference a known faction.'); return units; };
const parseObjectives = (value: unknown, board: BoardDocument) => { const objectives = array(value, 'Objectives').map(parseObjective); unique(objectives, 'Objectives'); const pieceIds = new Set(board.pieces.map((piece) => piece.id)); if (objectives.some((objective) => objective.sourcePieceId !== null && !pieceIds.has(objective.sourcePieceId))) throw new BattleSessionValidationError('Every objective source piece must exist on the session board snapshot.'); return objectives; };

function parseCreateCommand(value: unknown): SessionCreateCommand {
  const raw = record(value, 'Session create command');
  if (raw.type !== 'session.create') throw new BattleSessionValidationError('Session create command type must be session.create.');
  let board: BoardDocument;
  try { board = parseBoard(raw.board); } catch (error) { throw new BattleSessionValidationError(error instanceof Error ? `Session board is invalid: ${error.message}` : 'Session board is invalid.'); }
  const factions = parseFactions(raw.factions);
  return { type: 'session.create', id: text(raw.id, 'Session create command id', 80), at: timestamp(raw.at, 'Session create command timestamp'), sessionId: text(raw.sessionId, 'Session id', 80), name: text(raw.name, 'Session name', 120), board, seed: text(raw.seed, 'Session seed', 200), adapter: parseAdapter(raw.adapter), factions, units: parseUnits(raw.units, factions), objectives: parseObjectives(raw.objectives, board) };
}

export function parseBattleCommand(value: unknown): BattleCommand {
  const raw = record(value, 'Battle command');
  if (raw.type === 'session.create') return parseCreateCommand(raw);
  const base = { id: text(raw.id, 'Battle command id', 80), at: timestamp(raw.at, 'Battle command timestamp') };
  if (raw.type === 'unit.deploy') return { type: raw.type, ...base, unitId: text(raw.unitId, 'Unit id', 80), position: parsePosition(raw.position, 'Deployment position') };
  if (raw.type === 'phase.change') { const phase = raw.phase; if (typeof phase !== 'string' || !phases.has(phase as BattlePhase)) throw new BattleSessionValidationError('Battle phase is not supported.'); return { type: raw.type, ...base, phase: phase as BattlePhase, activeFactionId: raw.activeFactionId === null ? null : text(raw.activeFactionId, 'Active faction id', 80), round: integer(raw.round, 'Round', 1, 10_000) }; }
  if (raw.type === 'move.intent') return { type: raw.type, ...base, unitId: text(raw.unitId, 'Unit id', 80), destination: parsePosition(raw.destination, 'Move destination') };
  if (raw.type === 'roll.request') { const minimum = integer(raw.minimum, 'Roll minimum', -1_000_000, 1_000_000); const maximum = integer(raw.maximum, 'Roll maximum', -1_000_000, 1_000_000); if (minimum > maximum) throw new BattleSessionValidationError('Roll minimum cannot exceed maximum.'); return { type: raw.type, ...base, rollId: text(raw.rollId, 'Roll id', 80), minimum, maximum }; }
  if (raw.type === 'objective.state') return { type: raw.type, ...base, objectiveId: text(raw.objectiveId, 'Objective id', 80), state: text(raw.state, 'Objective state', 80, true) };
  if (raw.type === 'log.append') return { type: raw.type, ...base, message: text(raw.message, 'Log message', 1000) };
  throw new BattleSessionValidationError('Battle command type is not supported.');
}

const parseEvent = (value: unknown, index: number): BattleEvent => {
  const raw = record(value, `Battle event ${index + 1}`);
  const base = { sequence: integer(raw.sequence, `Battle event ${index + 1} sequence`, 1, 1_000_000), commandId: text(raw.commandId, `Battle event ${index + 1} command id`, 80), at: timestamp(raw.at, `Battle event ${index + 1} timestamp`) };
  if (base.sequence !== index + 1) throw new BattleSessionValidationError('Battle event sequences must be contiguous from one.');
  if (raw.type === 'session.created') return { type: raw.type, ...base, sessionId: text(raw.sessionId, 'Created session id', 80) };
  if (raw.type === 'unit.deployed') return { type: raw.type, ...base, unitId: text(raw.unitId, 'Deployed unit id', 80), position: parsePosition(raw.position, 'Deployment position') };
  if (raw.type === 'phase.changed') { const phase = raw.phase; if (typeof phase !== 'string' || !phases.has(phase as BattlePhase)) throw new BattleSessionValidationError('Event battle phase is not supported.'); return { type: raw.type, ...base, phase: phase as BattlePhase, activeFactionId: raw.activeFactionId === null ? null : text(raw.activeFactionId, 'Event active faction id', 80), round: integer(raw.round, 'Event round', 1, 10_000) }; }
  if (raw.type === 'move.intent.recorded') return { type: raw.type, ...base, unitId: text(raw.unitId, 'Move unit id', 80), destination: parsePosition(raw.destination, 'Move destination') };
  if (raw.type === 'roll.requested') { const minimum = integer(raw.minimum, 'Roll minimum', -1_000_000, 1_000_000); const maximum = integer(raw.maximum, 'Roll maximum', -1_000_000, 1_000_000); if (minimum > maximum) throw new BattleSessionValidationError('Roll minimum cannot exceed maximum.'); return { type: raw.type, ...base, rollId: text(raw.rollId, 'Roll id', 80), minimum, maximum }; }
  if (raw.type === 'roll.resolved') { const minimum = integer(raw.minimum, 'Roll minimum', -1_000_000, 1_000_000); const maximum = integer(raw.maximum, 'Roll maximum', -1_000_000, 1_000_000); const result = integer(raw.result, 'Roll result', -1_000_000, 1_000_000); if (minimum > maximum || result < minimum || result > maximum) throw new BattleSessionValidationError('Roll result must fit within ordered roll bounds.'); return { type: raw.type, ...base, rollId: text(raw.rollId, 'Roll id', 80), minimum, maximum, result }; }
  if (raw.type === 'objective.state.changed') return { type: raw.type, ...base, objectiveId: text(raw.objectiveId, 'Objective id', 80), state: text(raw.state, 'Objective state', 80, true) };
  if (raw.type === 'log.appended') return { type: raw.type, ...base, message: text(raw.message, 'Log message', 1000) };
  throw new BattleSessionValidationError('Battle event type is not supported.');
};

const parseRandom = (value: unknown): SerializableRandomState => {
  const raw = record(value, 'Random state');
  try { return validateRandomState({ algorithm: raw.algorithm as typeof RANDOM_ALGORITHM, seed: raw.seed as string, state: raw.state as number }); }
  catch (error) { throw new BattleSessionValidationError(error instanceof Error ? error.message : 'Random state is invalid.'); }
};
const parseTurn = (value: unknown, factions: readonly BattleFaction[], units: readonly BattleUnit[]): BattleTurnState => {
  const raw = record(value, 'Turn state');
  const phase = raw.phase;
  if (typeof phase !== 'string' || !phases.has(phase as BattlePhase)) throw new BattleSessionValidationError('Turn phase is not supported.');
  const activeFactionId = raw.activeFactionId === null ? null : text(raw.activeFactionId, 'Active faction id', 80);
  if (activeFactionId !== null && !factions.some((faction) => faction.id === activeFactionId)) throw new BattleSessionValidationError('Active faction must exist.');
  let moveIntent: BattleTurnState['moveIntent'] = null;
  if (raw.moveIntent !== null) { const intent = record(raw.moveIntent, 'Move intent'); const unitId = text(intent.unitId, 'Move intent unit id', 80); if (!units.some((unit) => unit.id === unitId)) throw new BattleSessionValidationError('Move intent unit must exist.'); moveIntent = { unitId, destination: parsePosition(intent.destination, 'Move intent destination') }; }
  return { round: integer(raw.round, 'Turn round', 1, 10_000), phase: phase as BattlePhase, activeFactionId, moveIntent };
};
const parseReplay = (value: unknown): BattleReplay => {
  const raw = record(value, 'Replay metadata');
  if (raw.engineVersion !== BATTLE_ENGINE_VERSION) throw new BattleSessionValidationError(`Replay engine version must be ${BATTLE_ENGINE_VERSION}.`);
  const createdWith = parseCreateCommand(raw.createdWith);
  const commands = array(raw.commands, 'Replay commands').map(parseBattleCommand);
  if (commands.some((command) => command.type === 'session.create')) throw new BattleSessionValidationError('Replay commands cannot create a second session.');
  const allIds = [createdWith.id, ...commands.map((command) => command.id)];
  if (new Set(allIds).size !== allIds.length) throw new BattleSessionValidationError('Replay command IDs must be unique.');
  return { engineVersion: BATTLE_ENGINE_VERSION, createdWith, commands: commands as ReplayCommand[] };
};

export function parseBattleSession(value: unknown): BattleSession {
  const raw = record(migrateBattleSession(value), 'Battle session');
  if (raw.version !== BATTLE_SESSION_VERSION) throw new BattleSessionValidationError(`This file uses unsupported battle session version “${String(raw.version)}”.`);
  const boardRaw = record(raw.board, 'Session board');
  let snapshot: BoardDocument;
  try { snapshot = parseBoard(boardRaw.snapshot); } catch (error) { throw new BattleSessionValidationError(error instanceof Error ? `Session board snapshot is invalid: ${error.message}` : 'Session board snapshot is invalid.'); }
  const board = { boardId: text(boardRaw.boardId, 'Session board id', 80), boardVersion: integer(boardRaw.boardVersion, 'Session board version', 1, 1_000), snapshot };
  if (board.boardId !== snapshot.id || board.boardVersion !== snapshot.version) throw new BattleSessionValidationError('Session board reference must match its snapshot.');
  const terrain = terrainFactsFromBoard(snapshot);
  if (JSON.stringify(raw.terrain) !== JSON.stringify(terrain)) throw new BattleSessionValidationError('Session terrain facts must match the immutable board snapshot.');
  const factions = parseFactions(raw.factions);
  const units = parseUnits(raw.units, factions);
  const objectives = parseObjectives(raw.objectives, snapshot);
  const replay = parseReplay(raw.replay);
  if (replay.createdWith.sessionId !== raw.id) throw new BattleSessionValidationError('Replay creation command must reference this session.');
  const random = parseRandom(raw.random);
  if (random.seed !== text(raw.seed, 'Session seed', 200)) throw new BattleSessionValidationError('Session random seed must match its serialized random state.');
  const events = array(raw.events, 'Battle event history').map(parseEvent);
  const result: BattleSession = { version: BATTLE_SESSION_VERSION, id: text(raw.id, 'Session id', 80), name: text(raw.name, 'Session name', 120), createdAt: timestamp(raw.createdAt, 'Session created timestamp'), updatedAt: timestamp(raw.updatedAt, 'Session updated timestamp'), board, terrain, seed: random.seed, random, adapter: parseAdapter(raw.adapter), factions, units, objectives, turn: parseTurn(raw.turn, factions, units), events, replay };
  if (result.id !== replay.createdWith.sessionId || result.name !== replay.createdWith.name || result.seed !== replay.createdWith.seed || result.board.snapshot.id !== replay.createdWith.board.id) throw new BattleSessionValidationError('Session metadata must match its replay creation command.');
  return result;
}

export type BattleSessionImportResult = { ok: true; session: BattleSession } | { ok: false; message: string };
export function validateBattleSessionImport(input: string): BattleSessionImportResult { try { return { ok: true, session: parseBattleSession(JSON.parse(input) as unknown) }; } catch (error) { return { ok: false, message: error instanceof Error ? error.message : 'This file could not be read.' }; } }

export function initialBattleSession(command: SessionCreateCommand): BattleSession {
  const parsed = parseCreateCommand(command);
  const random = createRandomState(parsed.seed);
  const event = { sequence: 1, type: 'session.created' as const, commandId: parsed.id, at: parsed.at, sessionId: parsed.sessionId };
  return { version: BATTLE_SESSION_VERSION, id: parsed.sessionId, name: parsed.name, createdAt: parsed.at, updatedAt: parsed.at, board: { boardId: parsed.board.id, boardVersion: parsed.board.version, snapshot: parsed.board }, terrain: terrainFactsFromBoard(parsed.board), seed: parsed.seed, random, adapter: parsed.adapter, factions: parsed.factions, units: parsed.units, objectives: parsed.objectives, turn: { round: 1, phase: 'setup', activeFactionId: null, moveIntent: null }, events: [event], replay: { engineVersion: BATTLE_ENGINE_VERSION, createdWith: parsed, commands: [] } };
}
