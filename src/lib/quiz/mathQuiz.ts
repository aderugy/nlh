/**
 * Poker-maths problem generation and grading.
 *
 * Four topics, all pure and seedable so a question can be replayed and regraded:
 *
 *  - `mdf`     — minimum defense frequency facing a bet.
 *  - `potodds` — the pot odds you are getting to call, as a ratio.
 *  - `outs`    — your odds of hitting on the turn from a number of outs, as a ratio.
 *  - `bluff`   — the optimal bluff frequency for a bet size.
 *
 * Bet sizes are drilled from a fixed set of pot percentages. The pot is
 * normalised to {@link POT} for display; only the bet-to-pot ratio matters.
 */

import { type Rng, mulberry32, randomInt } from "../rng";

export type MathTopic = "mdf" | "potodds" | "outs" | "bluff";

/** How a topic's answer is entered: a percentage, or a ratio typed as `X : 1`. */
export type AnswerKind = "percent" | "ratio";

export const MATH_TOPICS: readonly MathTopic[] = ["mdf", "potodds", "outs", "bluff"];

export interface MathTopicMeta {
  topic: MathTopic;
  /** Label in the user's own French, per CLAUDE.md. */
  label: string;
  answerKind: AnswerKind;
  /** Short suffix shown next to the input, e.g. `%` or `: 1`. */
  answerHint: string;
}

export const TOPIC_META: Record<MathTopic, MathTopicMeta> = {
  mdf: { topic: "mdf", label: "MDF", answerKind: "percent", answerHint: "%" },
  potodds: { topic: "potodds", label: "Cotes du pot", answerKind: "ratio", answerHint: ": 1" },
  outs: { topic: "outs", label: "Cotes (outs → turn)", answerKind: "ratio", answerHint: ": 1" },
  bluff: { topic: "bluff", label: "Fréquence de bluff", answerKind: "percent", answerHint: "%" },
};

/** The bet sizes drilled, as a percentage of the pot. */
export const BET_SIZES: readonly number[] = [
  10, 25, 33, 50, 66, 75, 90, 100, 120, 150, 200, 300, 400, 500,
];

/** Cards unseen when you act on the flop: 52 − your 2 − the 3 board cards. */
export const UNSEEN_ON_FLOP = 47;

const OUTS_MIN = 1;
const OUTS_MAX = 20;

/** The pot is normalised to this for display; grading only uses the bet ratio. */
export const POT = 100;

export interface MathQuestion {
  topic: MathTopic;
  /** Bet as a percentage of the pot, for size-based topics; null for `outs`. */
  sizePct: number | null;
  /** Number of outs, for `outs`; null otherwise. */
  outs: number | null;
  seed: number;
}

/** Draw one question from the selected topics, or null if none are selected. */
export function generateMathQuestion(
  topics: readonly MathTopic[],
  seed: number,
): MathQuestion | null {
  if (topics.length === 0) return null;
  const rng: Rng = mulberry32(seed);
  const topic = topics[randomInt(rng, topics.length)];

  if (topic === "outs") {
    const outs = OUTS_MIN + randomInt(rng, OUTS_MAX - OUTS_MIN + 1);
    return { topic, sizePct: null, outs, seed };
  }

  const sizePct = BET_SIZES[randomInt(rng, BET_SIZES.length)];
  return { topic, sizePct, outs: null, seed };
}

/** Stable key for de-duplicating questions in a session. */
export function questionKey(q: MathQuestion): string {
  return q.topic === "outs" ? `outs:${q.outs}` : `${q.topic}:${q.sizePct}`;
}

export interface MathSolution {
  answerKind: AnswerKind;
  /**
   * The comparable percentage the answer is graded on: the frequency itself for
   * `mdf`/`bluff`, or the implied probability/equity for the ratio topics.
   */
  valuePercent: number;
  /** The odds as `X` (meaning `X : 1`) for ratio topics; null for percent topics. */
  ratioX: number | null;
  /** One-line worked explanation, in French. */
  explanation: string;
}

/** Round to one decimal for display without dragging float noise into the text. */
function r1(value: number): string {
  return value.toFixed(1);
}

export function solveMathQuestion(q: MathQuestion): MathSolution {
  switch (q.topic) {
    case "mdf": {
      const bet = q.sizePct as number;
      const mdf = (POT / (POT + bet)) * 100;
      return {
        answerKind: "percent",
        valuePercent: mdf,
        ratioX: null,
        explanation: `MDF = pot / (pot + mise) = ${POT} / (${POT} + ${bet}) = ${r1(mdf)} %`,
      };
    }
    case "bluff": {
      const bet = q.sizePct as number;
      const freq = (bet / (POT + 2 * bet)) * 100;
      return {
        answerKind: "percent",
        valuePercent: freq,
        ratioX: null,
        explanation: `Bluff = mise / (pot + 2·mise) = ${bet} / (${POT} + ${2 * bet}) = ${r1(freq)} %`,
      };
    }
    case "potodds": {
      const bet = q.sizePct as number;
      const ratioX = (POT + bet) / bet; // (pot + mise) : mise, written as X : 1
      const equity = (100 / (ratioX + 1)); // = bet / (pot + 2·bet)
      return {
        answerKind: "ratio",
        valuePercent: equity,
        ratioX,
        explanation: `Cotes = (pot + mise) : mise = ${POT + bet} : ${bet} = ${r1(ratioX)} : 1 → il faut ${r1(equity)} % d'équité pour payer`,
      };
    }
    case "outs": {
      const n = q.outs as number;
      const ratioX = (UNSEEN_ON_FLOP - n) / n; // misses : hits
      const equity = (n / UNSEEN_ON_FLOP) * 100;
      return {
        answerKind: "ratio",
        valuePercent: equity,
        ratioX,
        explanation: `${n} outs sur ${UNSEEN_ON_FLOP} cartes inconnues → ${UNSEEN_ON_FLOP - n} : ${n} = ${r1(ratioX)} : 1 (${r1(equity)} % de toucher à la turn)`,
      };
    }
  }
}

/**
 * Convert a raw answer to the percentage it is graded on. A percent answer is
 * already that percentage; a ratio answer `X` (meaning `X : 1`) implies a
 * probability of `100 / (X + 1)`.
 */
export function answerToPercent(kind: AnswerKind, raw: number): number {
  return kind === "percent" ? raw : 100 / (raw + 1);
}

export interface MathGrade {
  correct: boolean;
  /** The user's answer expressed as the comparable percentage. */
  answerPercent: number;
  /** Signed error in points (answer − correct). */
  error: number;
  absoluteError: number;
  /** The band applied, in points. */
  tolerance: number;
}

/**
 * Grade a raw answer against the solution. Both ratio and percent answers are
 * compared in percentage points — a ratio via the probability it implies — so
 * one tolerance covers every topic and a small rounding of a steep ratio is
 * forgiven the way it should be.
 */
export function gradeMathAnswer(
  solution: MathSolution,
  rawAnswer: number,
  tolerance: number,
): MathGrade {
  const answerPercent = answerToPercent(solution.answerKind, rawAnswer);
  const error = answerPercent - solution.valuePercent;
  const absoluteError = Math.abs(error);
  return { correct: absoluteError <= tolerance, answerPercent, error, absoluteError, tolerance };
}

/** Compact label for a question, used in the results list. */
export function questionLabel(q: MathQuestion): string {
  const meta = TOPIC_META[q.topic];
  return q.topic === "outs" ? `${meta.label} · ${q.outs} outs` : `${meta.label} · ${q.sizePct}%`;
}
