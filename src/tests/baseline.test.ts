import { describe, expect, it } from 'vitest';

describe('project baseline', () => {
  it('runs unit tests in the configured isolated Node environment', () => {
    expect(typeof window).toBe('undefined');
  });
});
