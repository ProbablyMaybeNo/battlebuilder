export type MigrationInput = Record<string, unknown>;
export type BoardMigration = (document: MigrationInput) => MigrationInput;

const isRecord = (value: unknown): value is MigrationInput => typeof value === 'object' && value !== null && !Array.isArray(value);

/** Every supported input version has a migration entry. V1 is deliberately a no-op. */
export const boardMigrations: Readonly<Record<number, BoardMigration>> = {
  1: (document) => ({ ...document, version: 1 }),
};

export function migrateBoardDocument(value: unknown): MigrationInput {
  if (!isRecord(value)) throw new Error('The file must contain a board document object.');
  if (!Number.isInteger(value.version)) throw new Error('Board version must be an integer.');
  const migration = boardMigrations[value.version as number];
  if (!migration) throw new Error(`This file uses unsupported board version “${String(value.version)}”.`);
  return migration({ ...value });
}
