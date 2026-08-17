/**
 * Equity of one hero hand against one weighted villain range **on a flop**.
 *
 * Equity is the expected share of the pot hero wins at showdown, running the
 * board out with no further betting:
 *
 *     equity = (wins + 0.5 * ties) / runouts
 *
 * A tie splits the pot, so it is worth exactly half a win — never a loss, and
 * never dropped from the denominator. Showdowns are heads-up only, so a tie is
 * always a 2-way chop.
 *
 * Over a weighted range the answer is the weight-average of per-combo equities,
 * with hero's and the flop's blockers removed *before* the weights are
 * normalised:
 *
 *     equity = Σ w(c) * equity(hero, c) / Σ w(c)
 *
 * Because only the turn and river are unknown, this is computed **exactly**: 45
 * cards remain once hero's two, the flop's three and villain's two are gone, so
 * every one of the C(45,2) = 990 runouts is enumerated. No Monte Carlo, no
 * sampling error, which is what makes the graded answer trustworthy.
 */

import { type Card, DECK_SIZE, cardCode } from "../ranges/cards";
import { type Hand, handCombos } from "../ranges/hands";
import { evaluate7 } from "./evaluate";

/** Runouts per villain combo: C(45, 2). */
export const RUNOUTS_PER_COMBO = 990;

/**
 * A range as a flat, blocker-free combo list. Used for villain's range and for
 * sampling hero's hand out of hero's range.
 */
export interface ComboTable {
  /** First card of each surviving combo. */
  a: Int32Array;
  /** Second card of each surviving combo. */
  b: Int32Array;
  /** Weight of each surviving combo. */
  weight: Float64Array;
  /** Running weight sum; `cumulative[i]` includes combo `i`. */
  cumulative: Float64Array;
  /** Σ w(c) over surviving combos — the normalising denominator. */
  totalWeight: number;
  size: number;
  /** Combos removed because a dead card blocked them. */
  blocked: number;
}

/**
 * Flatten a weighted range to its combos, dropping any that use a dead card
 * (hero's hand and the flop).
 */
export function buildComboTable(
  weights: ReadonlyMap<Hand, number>,
  dead: readonly Card[],
): ComboTable {
  const a: number[] = [];
  const b: number[] = [];
  const weight: number[] = [];
  const cumulative: number[] = [];
  let total = 0;
  let blocked = 0;

  for (const [hand, handWeight] of weights) {
    if (!(handWeight > 0)) continue;
    for (const [c1, c2] of handCombos(hand)) {
      if (dead.includes(c1) || dead.includes(c2)) {
        blocked++;
        continue;
      }
      total += handWeight;
      a.push(c1);
      b.push(c2);
      weight.push(handWeight);
      cumulative.push(total);
    }
  }

  return {
    a: Int32Array.from(a),
    b: Int32Array.from(b),
    weight: Float64Array.from(weight),
    cumulative: Float64Array.from(cumulative),
    totalWeight: total,
    size: a.length,
    blocked,
  };
}

/** Index of the combo whose cumulative weight covers `target` in `[0, total)`. */
export function comboAtWeight(table: ComboTable, target: number): number {
  let lo = 0;
  let hi = table.size - 1;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (table.cumulative[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export interface EquityResult {
  /** Expected pot share, 0..1. */
  equity: number;
  /** Weighted share of runouts hero wins outright, 0..1. */
  winShare: number;
  /** Weighted share that chop. */
  tieShare: number;
  /** Weighted share hero loses. */
  loseShare: number;
  /** Villain combos left after removing hero's cards and the flop. */
  combos: number;
  /** Villain combos those dead cards blocked. */
  blocked: number;
  /** Total runouts evaluated. */
  runouts: number;
}

export const EMPTY_RESULT: EquityResult = {
  equity: 0,
  winShare: 0,
  tieShare: 0,
  loseShare: 0,
  combos: 0,
  blocked: 0,
  runouts: 0,
};

/**
 * Exact flop equity by enumerating every turn/river.
 *
 * Hero's showdown score depends only on the runout, not on which combo villain
 * holds, so it is precomputed once for all 1081 turn/river pairs and reused for
 * every villain combo — that halves the evaluator calls.
 */
export function equityOnFlop(
  hero: readonly [Card, Card],
  flop: readonly [Card, Card, Card],
  villain: ComboTable,
): EquityResult {
  // A card used twice would leave the runout enumeration one card short and
  // quietly skew the answer. Since this number gets graded, refuse it instead.
  const known = [hero[0], hero[1], flop[0], flop[1], flop[2]];
  if (new Set(known).size !== known.length) {
    throw new Error(
      `hero and board share a card (${known.map(cardCode).join(" ")}) — hero's hand must be dealt out of the remaining deck`,
    );
  }

  if (villain.size === 0) {
    return { ...EMPTY_RESULT, combos: 0, blocked: villain.blocked };
  }

  const [h0, h1] = hero;
  const [f0, f1, f2] = flop;

  // The 47 cards neither hero nor the flop holds.
  const available = new Int32Array(DECK_SIZE - 5);
  let count = 0;
  for (let card = 0; card < DECK_SIZE; card++) {
    if (card !== h0 && card !== h1 && card !== f0 && card !== f1 && card !== f2) {
      available[count++] = card;
    }
  }

  // heroScore[turn * 52 + river], symmetric in turn/river.
  const heroScore = new Int32Array(DECK_SIZE * DECK_SIZE);
  for (let i = 0; i < count; i++) {
    const turn = available[i];
    for (let j = i + 1; j < count; j++) {
      const river = available[j];
      const score = evaluate7(h0, h1, f0, f1, f2, turn, river);
      heroScore[turn * DECK_SIZE + river] = score;
      heroScore[river * DECK_SIZE + turn] = score;
    }
  }

  let weightedEquity = 0;
  let weightedWins = 0;
  let weightedTies = 0;
  let weightedLosses = 0;
  let runouts = 0;

  for (let c = 0; c < villain.size; c++) {
    const v0 = villain.a[c];
    const v1 = villain.b[c];
    const comboWeight = villain.weight[c];

    let wins = 0;
    let ties = 0;
    let losses = 0;

    for (let i = 0; i < count; i++) {
      const turn = available[i];
      if (turn === v0 || turn === v1) continue;
      const heroRow = turn * DECK_SIZE;
      for (let j = i + 1; j < count; j++) {
        const river = available[j];
        if (river === v0 || river === v1) continue;
        const villainScore = evaluate7(v0, v1, f0, f1, f2, turn, river);
        const score = heroScore[heroRow + river];
        if (score > villainScore) wins++;
        else if (score === villainScore) ties++;
        else losses++;
      }
    }

    const total = wins + ties + losses;
    if (total === 0) continue;
    weightedEquity += comboWeight * ((wins + 0.5 * ties) / total);
    weightedWins += (comboWeight * wins) / total;
    weightedTies += (comboWeight * ties) / total;
    weightedLosses += (comboWeight * losses) / total;
    runouts += total;
  }

  const denominator = villain.totalWeight;
  return {
    equity: weightedEquity / denominator,
    winShare: weightedWins / denominator,
    tieShare: weightedTies / denominator,
    loseShare: weightedLosses / denominator,
    combos: villain.size,
    blocked: villain.blocked,
    runouts,
  };
}

/** Convenience wrapper: remove blockers, then enumerate. */
export function equityOf(
  hero: readonly [Card, Card],
  flop: readonly [Card, Card, Card],
  villainWeights: ReadonlyMap<Hand, number>,
): EquityResult {
  const table = buildComboTable(villainWeights, [hero[0], hero[1], flop[0], flop[1], flop[2]]);
  return equityOnFlop(hero, flop, table);
}
