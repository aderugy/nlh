/**
 * Session model for the range quiz.
 *
 * Mirrors the equity session: configured once (one range, a hand count), then
 * drilled as a fixed list of hands the user scrolls through. Nothing is revealed
 * while drilling — answers are only graded when the session is summarised.
 *
 * Pure and seedable: `(config, seed)` fully determines the whole session, so it
 * can be replayed hand for hand. Grading is a pure weight lookup, so — unlike
 * the equity session — there is no background solver: `summarizeRangeSession`
 * takes the parsed range and grades everything at once.
 */

import type { Hand } from "../ranges/hands";
import { mulberry32 } from "../rng";
import {
  type RangeAction,
  type RangeGrade,
  type RangeQuestion,
  generateRangeQuestion,
  gradeRangeAnswer,
} from "./rangeQuiz";

export interface RangeSessionConfig {
  rangeId: string;
  /** How many hands this session deals. */
  handCount: number;
}

export interface RangeSession {
  config: RangeSessionConfig;
  seed: number;
  questions: RangeQuestion[];
}

export const MIN_HANDS = 1;
export const MAX_HANDS = 100;
export const DEFAULT_HANDS = 20;

/** Attempts to avoid dealing the same combo twice before giving up. */
const DEDUPE_ATTEMPTS = 25;

/**
 * Build the question list up front from one seed.
 *
 * Repeats of the exact same combo are retried a bounded number of times; with
 * 1326 combos a modest session rarely collides, and a repeat is not worth
 * failing over. Retries consume the seeded rng, so the session stays reproducible.
 */
export function buildRangeSession(config: RangeSessionConfig, seed: number): RangeSession {
  const rng = mulberry32(seed);
  const questions: RangeQuestion[] = [];
  const seen = new Set<string>();
  const handCount = Math.max(MIN_HANDS, Math.min(MAX_HANDS, Math.trunc(config.handCount)));

  for (let i = 0; i < handCount; i++) {
    let question: RangeQuestion = generateRangeQuestion(config.rangeId, (rng() * 0x100000000) >>> 0);
    for (let attempt = 0; attempt < DEDUPE_ATTEMPTS; attempt++) {
      const key = `${question.hero[0]}-${question.hero[1]}`;
      if (!seen.has(key)) {
        seen.add(key);
        break;
      }
      question = generateRangeQuestion(config.rangeId, (rng() * 0x100000000) >>> 0);
    }
    questions.push(question);
  }

  return { config, seed, questions };
}

export interface RangeSessionRow {
  index: number;
  question: RangeQuestion;
  /** What the user chose, or null if they scrolled past without answering. */
  answer: RangeAction | null;
  /** Null when there is no answer to grade. */
  grade: RangeGrade | null;
}

export interface RangeActionTally {
  /** Hands whose correct answer is this action. */
  total: number;
  /** Of those, how many the user got right. */
  correct: number;
}

export interface RangeSessionSummary {
  rows: RangeSessionRow[];
  /** Hands the user answered. */
  answered: number;
  /** Hands the user scrolled past without answering. */
  skipped: number;
  correct: number;
  /** Accuracy over answered hands, in percent. */
  accuracy: number;
  /** Correct-vs-total split by the hand's true action — where the mistakes are. */
  byExpected: Record<RangeAction, RangeActionTally>;
}

/**
 * Grade the whole session at once against the range's weights. This is the only
 * place answers are turned into verdicts — during the drill they are not shown.
 */
export function summarizeRangeSession(
  session: RangeSession,
  answers: readonly (RangeAction | null)[],
  weights: ReadonlyMap<Hand, number>,
): RangeSessionSummary {
  const rows: RangeSessionRow[] = session.questions.map((question, index) => {
    const answer = answers[index] ?? null;
    const weight = weights.get(question.hand) ?? 0;
    const grade = answer !== null ? gradeRangeAnswer(answer, weight) : null;
    return { index, question, answer, grade };
  });

  const byExpected: Record<RangeAction, RangeActionTally> = {
    raise: { total: 0, correct: 0 },
    freq: { total: 0, correct: 0 },
    fold: { total: 0, correct: 0 },
  };

  let answered = 0;
  let correct = 0;
  for (const row of rows) {
    if (!row.grade) continue;
    answered++;
    const tally = byExpected[row.grade.expected];
    tally.total++;
    if (row.grade.correct) {
      correct++;
      tally.correct++;
    }
  }

  return {
    rows,
    answered,
    skipped: rows.length - answered,
    correct,
    accuracy: answered === 0 ? 0 : (correct / answered) * 100,
    byExpected,
  };
}
