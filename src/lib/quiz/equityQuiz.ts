/**
 * Equity-quiz problem generation and grading.
 *
 * Pure and seedable: `(heroWeights, seed)` fully determines the question, so a
 * hand can be replayed and regraded (see CLAUDE.md).
 */

import { buildComboTable, comboAtWeight } from "../equity/equity";
import type { Card } from "../ranges/cards";
import { type Hand, handOfCards } from "../ranges/hands";
import { type Rng, mulberry32, randomInt } from "../rng";
import { type Flop, TYPICAL_FLOPS } from "./flops";

export interface EquityQuestion {
  /** Hero's two specific cards. */
  hero: [Card, Card];
  /** The canonical cell those cards fall in, e.g. `"A5s"`. */
  hand: Hand;
  /** The flop this hand is played on. */
  flop: Flop;
  /** Index into the flop set, so the board can be labelled. */
  flopIndex: number;
  heroRangeId: string;
  villainRangeId: string;
  /** Seed that produced this question. */
  seed: number;
}

/**
 * Sample one combo from a weighted range, proportional to its weight.
 *
 * Sampling combos rather than the 169 cells is what keeps the deal honest: a
 * cell with more live combos comes up proportionally more often, so `AKo` is
 * dealt three times as often as `AKs` — and a hand the flop has partly blocked
 * comes up correspondingly less.
 */
export function sampleCombo(
  weights: ReadonlyMap<Hand, number>,
  dead: readonly Card[],
  rng: Rng,
): [Card, Card] | null {
  const table = buildComboTable(weights, dead);
  if (table.size === 0 || table.totalWeight <= 0) return null;
  const index = comboAtWeight(table, rng() * table.totalWeight);
  return [table.a[index], table.b[index]];
}

/** Pick one of the 15 typical flops, uniformly. */
export function sampleFlop(rng: Rng): number {
  return randomInt(rng, TYPICAL_FLOPS.length);
}

export function generateEquityQuestion(
  heroWeights: ReadonlyMap<Hand, number>,
  heroRangeId: string,
  villainRangeId: string,
  seed: number,
): EquityQuestion | null {
  const rng = mulberry32(seed);
  const flopIndex = sampleFlop(rng);
  const flop = TYPICAL_FLOPS[flopIndex];

  // Hero cannot hold a card that is on the board.
  const hero = sampleCombo(heroWeights, flop, rng);
  if (!hero) return null;

  return {
    hero,
    hand: handOfCards(hero[0], hero[1]),
    flop,
    flopIndex,
    heroRangeId,
    villainRangeId,
    seed,
  };
}

export interface EquityGrade {
  /** Within the tolerance band. */
  correct: boolean;
  /** Guess minus actual, in percentage points; negative means under-guessed. */
  error: number;
  /** Absolute error, in percentage points. */
  absoluteError: number;
  /** The band that was applied, in percentage points. */
  tolerance: number;
}

/**
 * Grade a guess against the computed equity. Both are percentages (0..100).
 * The tolerance band is a user setting, never a hardcoded constant.
 */
export function gradeEquityGuess(
  guessPercent: number,
  actualPercent: number,
  tolerance: number,
): EquityGrade {
  const error = guessPercent - actualPercent;
  const absoluteError = Math.abs(error);
  return { correct: absoluteError <= tolerance, error, absoluteError, tolerance };
}
