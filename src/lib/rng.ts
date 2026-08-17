/**
 * Seedable RNG. Problem generation and equity sampling are both seeded so a
 * question can be replayed and graded deterministically (see CLAUDE.md).
 */

export type Rng = () => number;

/** mulberry32 — small, fast, good enough for sampling combos and boards. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomSeed(): number {
  return (Math.random() * 0x100000000) >>> 0;
}

/** Uniform integer in `[0, n)`. */
export function randomInt(rng: Rng, n: number): number {
  return Math.min(n - 1, (rng() * n) | 0);
}
