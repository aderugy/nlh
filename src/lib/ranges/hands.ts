/**
 * The 169 canonical preflop hands ("AA", "AKs", "AKo") and the combos behind them.
 *
 * Combo counts are what make sampling honest: `AA` is 6 combos, `AKs` is 4 and
 * `AKo` is 12, so sampling uniformly over the 169 cells would over-represent
 * suited hands three-to-one (see CLAUDE.md).
 */

import {
  type Card,
  RANKS_DESC,
  SUIT_COUNT,
  makeCard,
  rankChar,
  rankIndex,
  rankOf,
  suitOf,
} from "./cards";

/** Canonical hand notation, e.g. `"AA"`, `"AKs"`, `"AKo"`. */
export type Hand = string;

export type HandShape = "pair" | "suited" | "offsuit";

export interface HandParts {
  /** Higher of the two ranks (equal to `lo` for pairs). */
  hi: number;
  lo: number;
  shape: HandShape;
}

export const PAIR_COMBOS = 6;
export const SUITED_COMBOS = 4;
export const OFFSUIT_COMBOS = 12;

export function makeHand(hi: number, lo: number, shape: HandShape): Hand {
  const a = Math.max(hi, lo);
  const b = Math.min(hi, lo);
  if (shape === "pair" || a === b) return rankChar(a) + rankChar(a);
  return rankChar(a) + rankChar(b) + (shape === "suited" ? "s" : "o");
}

export function parseHandNotation(hand: Hand): HandParts | null {
  if (hand.length < 2 || hand.length > 3) return null;
  const hi = rankIndex(hand[0]);
  const lo = rankIndex(hand[1]);
  if (hi < 0 || lo < 0) return null;
  const suffix = hand.length === 3 ? hand[2].toLowerCase() : "";
  if (hi === lo) {
    // A pair cannot be suited; treat a stray suffix as malformed.
    return suffix === "" ? { hi, lo, shape: "pair" } : null;
  }
  if (suffix !== "s" && suffix !== "o") return null;
  return {
    hi: Math.max(hi, lo),
    lo: Math.min(hi, lo),
    shape: suffix === "s" ? "suited" : "offsuit",
  };
}

export function comboCount(hand: Hand): number {
  const parts = parseHandNotation(hand);
  if (!parts) return 0;
  if (parts.shape === "pair") return PAIR_COMBOS;
  return parts.shape === "suited" ? SUITED_COMBOS : OFFSUIT_COMBOS;
}

/** Every specific two-card combo that the canonical hand stands for. */
export function handCombos(hand: Hand): [Card, Card][] {
  const parts = parseHandNotation(hand);
  if (!parts) return [];
  const { hi, lo, shape } = parts;
  const out: [Card, Card][] = [];
  if (shape === "pair") {
    for (let s1 = 0; s1 < SUIT_COUNT; s1++) {
      for (let s2 = s1 + 1; s2 < SUIT_COUNT; s2++) {
        out.push([makeCard(hi, s1), makeCard(hi, s2)]);
      }
    }
  } else if (shape === "suited") {
    for (let s = 0; s < SUIT_COUNT; s++) {
      out.push([makeCard(hi, s), makeCard(lo, s)]);
    }
  } else {
    for (let s1 = 0; s1 < SUIT_COUNT; s1++) {
      for (let s2 = 0; s2 < SUIT_COUNT; s2++) {
        if (s1 !== s2) out.push([makeCard(hi, s1), makeCard(lo, s2)]);
      }
    }
  }
  return out;
}

/** Which of the 169 cells two specific cards belong to. */
export function handOfCards(a: Card, b: Card): Hand {
  const ra = rankOf(a);
  const rb = rankOf(b);
  if (ra === rb) return makeHand(ra, rb, "pair");
  return makeHand(ra, rb, suitOf(a) === suitOf(b) ? "suited" : "offsuit");
}

/**
 * The 13x13 grid, row-major, ranks descending. Suited hands sit above the
 * diagonal, offsuit below — the standard layout the user's range editor uses.
 */
export const HAND_GRID: readonly (readonly Hand[])[] = RANKS_DESC.map((rowRank, row) =>
  RANKS_DESC.map((colRank, col) => {
    if (row === col) return makeHand(rowRank, colRank, "pair");
    return row < col
      ? makeHand(rowRank, colRank, "suited")
      : makeHand(colRank, rowRank, "offsuit");
  }),
);

/** All 169 canonical hands in grid order. */
export const ALL_HANDS: readonly Hand[] = HAND_GRID.flat();

/** Total combos in a weighted range — the "how wide is this" number. */
export function weightedComboCount(weights: ReadonlyMap<Hand, number>): number {
  let total = 0;
  for (const [hand, weight] of weights) {
    total += comboCount(hand) * weight;
  }
  return total;
}

/** Share of all 1326 preflop combos covered by a weighted range, in percent. */
export const TOTAL_COMBOS = 1326;

export function rangePercent(weights: ReadonlyMap<Hand, number>): number {
  return (weightedComboCount(weights) / TOTAL_COMBOS) * 100;
}
