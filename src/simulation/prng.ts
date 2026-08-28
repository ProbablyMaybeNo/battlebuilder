import { RANDOM_ALGORITHM, type SerializableRandomState } from './contracts';

const UINT32_RANGE = 0x1_0000_0000;
const asUint32 = (value: number) => value >>> 0;

/** Stable FNV-1a seed hashing; do not replace without introducing a new algorithm id. */
export function seedToState(seed: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return asUint32(hash);
}

export function createRandomState(seed: string): SerializableRandomState {
  if (!seed.trim()) throw new Error('Random seed must be non-empty text.');
  return { algorithm: RANDOM_ALGORITHM, seed, state: seedToState(seed) };
}

export function validateRandomState(value: SerializableRandomState): SerializableRandomState {
  if (value.algorithm !== RANDOM_ALGORITHM || typeof value.seed !== 'string' || !value.seed.trim() || !Number.isInteger(value.state) || value.state < 0 || value.state >= UINT32_RANGE) throw new Error('Random state is invalid.');
  return { algorithm: RANDOM_ALGORITHM, seed: value.seed, state: value.state };
}

/** Mulberry32 returns a new serializable state and a number in [0, 1). */
export function nextRandom(random: SerializableRandomState): { random: SerializableRandomState; value: number } {
  const valid = validateRandomState(random);
  const state = asUint32(valid.state + 0x6d2b79f5);
  let value = state;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  const normalized = asUint32(value ^ (value >>> 14)) / UINT32_RANGE;
  return { random: { ...valid, state }, value: normalized };
}

export function rollRandom(random: SerializableRandomState, minimum: number, maximum: number): { random: SerializableRandomState; result: number } {
  if (!Number.isInteger(minimum) || !Number.isInteger(maximum) || minimum > maximum || minimum < -1_000_000 || maximum > 1_000_000) throw new Error('Roll bounds must be ordered integers between -1000000 and 1000000.');
  const next = nextRandom(random);
  return { random: next.random, result: minimum + Math.floor(next.value * (maximum - minimum + 1)) };
}
