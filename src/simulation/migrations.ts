export type MigrationInput = Record<string, unknown>;
export type BattleSessionMigration = (session: MigrationInput) => MigrationInput;

const isRecord = (value: unknown): value is MigrationInput => typeof value === 'object' && value !== null && !Array.isArray(value);

/** A registry exists from v1 so future session files always migrate before parsing. */
export const battleSessionMigrations: Readonly<Record<number, BattleSessionMigration>> = {
  1: (session) => ({ ...session, version: 1 }),
};

export function migrateBattleSession(value: unknown): MigrationInput {
  if (!isRecord(value)) throw new Error('The file must contain a battle session object.');
  if (!Number.isInteger(value.version)) throw new Error('Battle session version must be an integer.');
  const migration = battleSessionMigrations[value.version as number];
  if (!migration) throw new Error(`This file uses unsupported battle session version “${String(value.version)}”.`);
  return migration({ ...value });
}
