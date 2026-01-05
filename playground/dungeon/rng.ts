export type RNG = () => number;

/**
 * Hash a string into a 32-bit seed. Deterministic across platforms.
 * Chosen because you likely want URL/shareable seeds like "vienna-2026".
 */
export function seedFromString(input: string): number {
  // xmur3-style hashing (small, fast, deterministic)
  let h = 1779033703 ^ input.length;
  for (let i = 0; i < input.length; i++) {
    h = Math.imul(h ^ input.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  h ^= h >>> 16;
  return h >>> 0;
}

/**
 * Mulberry32 PRNG. Deterministic, good enough for procedural layout.
 * Use instead of Math.random() so steps are reproducible.
 */
export function mulberry32(seed: number): RNG {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export function intInRange(rng: RNG, minInclusive: number, maxInclusive: number): number {
  const r = rng();
  const span = maxInclusive - minInclusive + 1;
  return minInclusive + Math.floor(r * span);
}

export function floatInRange(rng: RNG, minInclusive: number, maxExclusive: number): number {
  return minInclusive + rng() * (maxExclusive - minInclusive);
}

export function pickOne<T>(rng: RNG, items: readonly T[]): T {
  if (items.length === 0) throw new Error('pickOne called with empty array');
  return items[Math.floor(rng() * items.length)];
}
