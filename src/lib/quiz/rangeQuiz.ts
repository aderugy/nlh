/**
 * Range-quiz problem generation and grading.
 *
 * The range quiz drills a single preflop range: the app deals a random hand and
 * the user classifies it as raise, freq (a mixed/randomised frequency) or fold.
 * The answer key is the range's own weight for that hand — 1 is a pure raise,
 * 0 is a fold, anything in between is played at a frequency.
 *
 * Pure and seedable: `(rangeId, seed)` fully determines the dealt hand, so a
 * question can be replayed and regraded (see CLAUDE.md).
 */

import { type Card, DECK_SIZE } from "../ranges/cards";
import { type Hand, handOfCards } from "../ranges/hands";
import { type Rng, mulberry32, randomInt } from "../rng";

/** The three answers. `freq` = played some of the time (a randomised mix). */
export type RangeAction = "raise" | "freq" | "fold";

export const RANGE_ACTIONS: readonly RangeAction[] = ["raise", "freq", "fold"];

export interface RangeQuestion {
  /** The two specific cards dealt. */
  hero: [Card, Card];
  /** The canonical cell those cards fall in, e.g. `"A5s"`. */
  hand: Hand;
  rangeId: string;
  /** Seed that produced this question. */
  seed: number;
}

/**
 * Sample one of the 1326 combos uniformly — two distinct cards, low card first.
 *
 * Sampling combos rather than the 169 cells is what keeps the deal honest: a
 * cell with more combos (`AKo`, 12) comes up proportionally more often than one
 * with fewer (`AKs`, 4), so the mix of hands you drill matches a real deal.
 */
export function sampleHand(rng: Rng): [Card, Card] {
  const a = randomInt(rng, DECK_SIZE);
  // Pick the second card uniformly from the other 51, then skip over `a` so the
  // two are always distinct while every unordered pair stays equally likely.
  let b = randomInt(rng, DECK_SIZE - 1);
  if (b >= a) b += 1;
  return a < b ? [a, b] : [b, a];
}

export function generateRangeQuestion(rangeId: string, seed: number): RangeQuestion {
  const rng = mulberry32(seed);
  const hero = sampleHand(rng);
  return { hero, hand: handOfCards(hero[0], hero[1]), rangeId, seed };
}

/** Floating-point slack so a decimal weight tag of `100.0000` still reads as pure. */
const EPSILON = 1e-9;

/** The correct action for a hand at a given weight (0..1). */
export function actionForWeight(weight: number): RangeAction {
  if (weight <= EPSILON) return "fold";
  if (weight >= 1 - EPSILON) return "raise";
  return "freq";
}

export interface RangeGrade {
  correct: boolean;
  chosen: RangeAction;
  expected: RangeAction;
  /** The range's true weight for the hand, 0..1. */
  weight: number;
}

/**
 * Grade a chosen action against the range's weight for the dealt hand. The
 * weight is the answer key: a mixed hand's one right answer is `freq`, and the
 * results screen shows the exact frequency so the mix is still visible.
 */
export function gradeRangeAnswer(chosen: RangeAction, weight: number): RangeGrade {
  const expected = actionForWeight(weight);
  return { correct: chosen === expected, chosen, expected, weight };
}

/** Display label for an action. */
export function actionLabel(action: RangeAction): string {
  return action === "raise" ? "Raise" : action === "freq" ? "Freq raise" : "Fold";
}
