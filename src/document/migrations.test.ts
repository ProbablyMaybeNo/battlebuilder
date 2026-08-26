import { describe, expect, it } from 'vitest';
import { boardMigrations, migrateBoardDocument } from './migrations';

describe('board migrations', () => {
  it('runs v1 through an explicit no-op migration without mutating the source', () => {
    const source = { version: 1, name: 'Original', nested: { preserved: true } };
    const migrated = migrateBoardDocument(source);
    expect(migrated).toEqual(source);
    expect(migrated).not.toBe(source);
    expect(boardMigrations[1]).toBeTypeOf('function');
  });

  it('rejects unsupported or malformed versions before parsing', () => {
    expect(() => migrateBoardDocument({ version: 2 })).toThrow(/unsupported/);
    expect(() => migrateBoardDocument({ version: '1' })).toThrow(/integer/);
    expect(() => migrateBoardDocument(null)).toThrow(/board document object/);
  });
});
