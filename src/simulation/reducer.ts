import type { BattleCommand, BattleEvent, BattleSession, ReplayCommand } from './contracts';
import { rollRandom } from './prng';
import { initialBattleSession, parseBattleCommand } from './session';

export type BattleReducerResult =
  | { ok: true; session: BattleSession; events: readonly BattleEvent[] }
  | { ok: false; session: BattleSession | null; message: string };

const failure = (session: BattleSession | null, message: string): BattleReducerResult => ({ ok: false, session, message });
const event = <T extends Omit<BattleEvent, 'sequence'>>(session: BattleSession, value: T): T & { sequence: number } => ({ ...value, sequence: session.events.length + 1 });
const hasCommand = (session: BattleSession, commandId: string) => session.replay.createdWith.id === commandId || session.replay.commands.some((command) => command.id === commandId);
const inBounds = (session: BattleSession, position: { x: number; y: number }) => position.x < session.board.snapshot.settings.widthInches && position.y < session.board.snapshot.settings.heightInches;
const withEvents = (session: BattleSession, command: ReplayCommand, events: readonly BattleEvent[], patch: Partial<BattleSession>): BattleReducerResult => ({
  ok: true,
  events,
  session: {
    ...session,
    ...patch,
    updatedAt: command.at,
    events: [...session.events, ...events],
    replay: { ...session.replay, commands: [...session.replay.commands, command] },
  },
});

/** Pure, renderer-neutral command reducer. Rules legality remains adapter work in B15. */
export function reduceBattleSession(current: BattleSession | null, input: BattleCommand | unknown): BattleReducerResult {
  let command: BattleCommand;
  try { command = parseBattleCommand(input); } catch (error) { return failure(current, error instanceof Error ? error.message : 'Battle command is invalid.'); }
  if (command.type === 'session.create') {
    if (current !== null) return failure(current, 'A battle session has already been created.');
    const session = initialBattleSession(command);
    return { ok: true, session, events: session.events };
  }
  if (!current) return failure(null, 'Create a battle session before applying commands.');
  if (hasCommand(current, command.id)) return failure(current, 'Battle command IDs must be unique.');
  if (!inBounds(current, command.type === 'unit.deploy' ? command.position : command.type === 'move.intent' ? command.destination : { x: 0, y: 0 })) {
    return failure(current, 'Battle position must fit within the board snapshot bounds.');
  }
  if (command.type === 'unit.deploy') {
    if (!current.units.some((unit) => unit.id === command.unitId)) return failure(current, 'Cannot deploy an unknown unit.');
    const events = [event(current, { type: 'unit.deployed', commandId: command.id, at: command.at, unitId: command.unitId, position: command.position })];
    return withEvents(current, command, events, { units: current.units.map((unit) => unit.id === command.unitId ? { ...unit, position: command.position } : unit) });
  }
  if (command.type === 'phase.change') {
    if (command.activeFactionId !== null && !current.factions.some((faction) => faction.id === command.activeFactionId)) return failure(current, 'Active faction must exist.');
    const events = [event(current, { type: 'phase.changed', commandId: command.id, at: command.at, phase: command.phase, activeFactionId: command.activeFactionId, round: command.round })];
    return withEvents(current, command, events, { turn: { ...current.turn, phase: command.phase, activeFactionId: command.activeFactionId, round: command.round, moveIntent: null } });
  }
  if (command.type === 'move.intent') {
    if (!current.units.some((unit) => unit.id === command.unitId)) return failure(current, 'Cannot record a move for an unknown unit.');
    const events = [event(current, { type: 'move.intent.recorded', commandId: command.id, at: command.at, unitId: command.unitId, destination: command.destination })];
    return withEvents(current, command, events, { units: current.units.map((unit) => unit.id === command.unitId ? { ...unit, position: command.destination } : unit), turn: { ...current.turn, moveIntent: { unitId: command.unitId, destination: command.destination } } });
  }
  if (command.type === 'roll.request') {
    if (command.minimum > command.maximum) return failure(current, 'Roll minimum cannot exceed maximum.');
    if (current.events.some((entry) => (entry.type === 'roll.requested' || entry.type === 'roll.resolved') && entry.rollId === command.rollId)) return failure(current, 'Roll IDs must be unique.');
    let roll: ReturnType<typeof rollRandom>;
    try { roll = rollRandom(current.random, command.minimum, command.maximum); } catch (error) { return failure(current, error instanceof Error ? error.message : 'Roll bounds are invalid.'); }
    const requested = event(current, { type: 'roll.requested', commandId: command.id, at: command.at, rollId: command.rollId, minimum: command.minimum, maximum: command.maximum });
    const resolved = { ...event({ ...current, events: [...current.events, requested] }, { type: 'roll.resolved' as const, commandId: command.id, at: command.at, rollId: command.rollId, minimum: command.minimum, maximum: command.maximum, result: roll.result }) };
    return withEvents(current, command, [requested, resolved], { random: roll.random });
  }
  if (command.type === 'objective.state') {
    if (!current.objectives.some((objective) => objective.id === command.objectiveId)) return failure(current, 'Cannot update an unknown objective.');
    const events = [event(current, { type: 'objective.state.changed', commandId: command.id, at: command.at, objectiveId: command.objectiveId, state: command.state })];
    return withEvents(current, command, events, { objectives: current.objectives.map((objective) => objective.id === command.objectiveId ? { ...objective, state: command.state } : objective) });
  }
  const events = [event(current, { type: 'log.appended', commandId: command.id, at: command.at, message: command.message })];
  return withEvents(current, command, events, {});
}

/** Replays a serialized creation command and command history without clocks or Math.random. */
export function replayBattleSession(session: BattleSession): BattleReducerResult {
  let result = reduceBattleSession(null, session.replay.createdWith);
  if (!result.ok) return result;
  for (const command of session.replay.commands) {
    result = reduceBattleSession(result.session, command);
    if (!result.ok) return result;
  }
  return result;
}
