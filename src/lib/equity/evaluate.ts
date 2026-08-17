/**
 * 7-card hand evaluator.
 *
 * Returns a comparable integer: higher is better, equal means a genuine tie
 * (which matters here — a tie is half a pot, not a loss). The score packs the
 * category in the high bits and up to five tiebreak ranks in 4-bit fields, so
 * comparing two scores with `>` compares category first, then kickers.
 */

import type { Card } from "../ranges/cards";

export const CATEGORY = {
  HIGH_CARD: 0,
  PAIR: 1,
  TWO_PAIR: 2,
  TRIPS: 3,
  STRAIGHT: 4,
  FLUSH: 5,
  FULL_HOUSE: 6,
  QUADS: 7,
  STRAIGHT_FLUSH: 8,
} as const;

export const CATEGORY_NAMES = [
  "High card",
  "Pair",
  "Two pair",
  "Three of a kind",
  "Straight",
  "Flush",
  "Full house",
  "Four of a kind",
  "Straight flush",
] as const;

export function categoryOf(score: number): number {
  return score >>> 20;
}

function score(category: number, r1 = 0, r2 = 0, r3 = 0, r4 = 0, r5 = 0): number {
  return (category << 20) | (r1 << 16) | (r2 << 12) | (r3 << 8) | (r4 << 4) | r5;
}

/**
 * Top rank of the best straight in a 13-bit rank mask, or -1.
 * Returns 3 (the five) for the A-2-3-4-5 wheel, which correctly ranks it below
 * a six-high straight.
 */
export function straightTop(rankMask: number): number {
  for (let top = 12; top >= 4; top--) {
    const need = 0b11111 << (top - 4);
    if ((rankMask & need) === need) return top;
  }
  const wheel = (1 << 12) | (1 << 3) | (1 << 2) | (1 << 1) | (1 << 0);
  if ((rankMask & wheel) === wheel) return 3;
  return -1;
}

// Scratch buffers. Single-threaded by construction: one worker, one evaluation
// at a time, so reusing them avoids allocating in the Monte Carlo inner loop.
const rankCounts = new Int32Array(13);
const suitMasks = new Int32Array(4);
const suitCounts = new Int32Array(4);

/** Highest `n` set bits of a rank mask, packed into a score's tiebreak fields. */
function packTop(mask: number, n: number): number {
  let packed = 0;
  let found = 0;
  for (let r = 12; r >= 0 && found < n; r--) {
    if (mask & (1 << r)) {
      packed |= r << (16 - found * 4);
      found++;
    }
  }
  return packed;
}

export function evaluate7(
  c0: Card,
  c1: Card,
  c2: Card,
  c3: Card,
  c4: Card,
  c5: Card,
  c6: Card,
): number {
  rankCounts.fill(0);
  suitMasks.fill(0);
  suitCounts.fill(0);

  // Unrolled: this is the Monte Carlo inner loop, so it avoids building an array.
  let rankMask = 0;
  let rk = c0 >> 2;
  let st = c0 & 3;
  rankCounts[rk]++; suitCounts[st]++; suitMasks[st] |= 1 << rk; rankMask |= 1 << rk;
  rk = c1 >> 2; st = c1 & 3;
  rankCounts[rk]++; suitCounts[st]++; suitMasks[st] |= 1 << rk; rankMask |= 1 << rk;
  rk = c2 >> 2; st = c2 & 3;
  rankCounts[rk]++; suitCounts[st]++; suitMasks[st] |= 1 << rk; rankMask |= 1 << rk;
  rk = c3 >> 2; st = c3 & 3;
  rankCounts[rk]++; suitCounts[st]++; suitMasks[st] |= 1 << rk; rankMask |= 1 << rk;
  rk = c4 >> 2; st = c4 & 3;
  rankCounts[rk]++; suitCounts[st]++; suitMasks[st] |= 1 << rk; rankMask |= 1 << rk;
  rk = c5 >> 2; st = c5 & 3;
  rankCounts[rk]++; suitCounts[st]++; suitMasks[st] |= 1 << rk; rankMask |= 1 << rk;
  rk = c6 >> 2; st = c6 & 3;
  rankCounts[rk]++; suitCounts[st]++; suitMasks[st] |= 1 << rk; rankMask |= 1 << rk;

  let flushSuit = -1;
  for (let s = 0; s < 4; s++) {
    if (suitCounts[s] >= 5) flushSuit = s;
  }

  if (flushSuit >= 0) {
    const flushMask = suitMasks[flushSuit];
    const sfTop = straightTop(flushMask);
    if (sfTop >= 0) return score(CATEGORY.STRAIGHT_FLUSH, sfTop);
  }

  // Rank multiplicities, high to low.
  let quad = -1;
  let trips1 = -1;
  let trips2 = -1;
  let pair1 = -1;
  let pair2 = -1;
  for (let r = 12; r >= 0; r--) {
    const count = rankCounts[r];
    if (count === 4) {
      if (quad < 0) quad = r;
    } else if (count === 3) {
      if (trips1 < 0) trips1 = r;
      else if (trips2 < 0) trips2 = r;
    } else if (count === 2) {
      if (pair1 < 0) pair1 = r;
      else if (pair2 < 0) pair2 = r;
    }
  }

  if (quad >= 0) {
    const kicker = packTop(rankMask & ~(1 << quad), 1) >>> 16;
    return score(CATEGORY.QUADS, quad, kicker);
  }

  if (trips1 >= 0 && (trips2 >= 0 || pair1 >= 0)) {
    // The second trips can only ever serve as the pair.
    const pairRank = Math.max(trips2, pair1);
    return score(CATEGORY.FULL_HOUSE, trips1, pairRank);
  }

  if (flushSuit >= 0) {
    return score(CATEGORY.FLUSH) | packTop(suitMasks[flushSuit], 5);
  }

  const sTop = straightTop(rankMask);
  if (sTop >= 0) return score(CATEGORY.STRAIGHT, sTop);

  if (trips1 >= 0) {
    return score(CATEGORY.TRIPS, trips1) | (packTop(rankMask & ~(1 << trips1), 2) >>> 4);
  }

  if (pair1 >= 0 && pair2 >= 0) {
    const kicker = packTop(rankMask & ~(1 << pair1) & ~(1 << pair2), 1) >>> 16;
    return score(CATEGORY.TWO_PAIR, pair1, pair2, kicker);
  }

  if (pair1 >= 0) {
    return score(CATEGORY.PAIR, pair1) | (packTop(rankMask & ~(1 << pair1), 3) >>> 4);
  }

  return score(CATEGORY.HIGH_CARD) | packTop(rankMask, 5);
}
