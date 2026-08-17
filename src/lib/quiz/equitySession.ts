/**
 * Session model for the equity quiz.
 *
 * A session is configured once, then drilled as a fixed list of questions the
 * user scrolls through. Nothing is revealed while drilling — guesses are only
 * graded when the session is summarised at the end.
 *
 * Pure and seedable: `(heroWeights, config, seed)` fully determines the whole
 * session, so it can be replayed hand for hand.
 */

import type { EquityResult } from "../equity/equity";
import type { Hand } from "../ranges/hands";
import { mulberry32 } from "../rng";
import { type EquityGrade, type EquityQuestion, generateEquityQuestion, gradeEquityGuess } from "./equityQuiz";

export interface EquitySessionConfig {
  heroRangeId: string;
  villainRangeId: string;
  /** Tolerance band in percentage points — a setting, never a constant. */
  tolerance: number;
  /** How many hands this session deals. */
  handCount: number;
}

export interface EquitySession {
  config: EquitySessionConfig;
  seed: number;
  questions: EquityQuestion[];
}

export const MIN_HANDS = 1;
export const MAX_HANDS = 100;
export const DEFAULT_HANDS = 10;
export const DEFAULT_TOLERANCE = 5;

/** Attempts to avoid repeating the same combo on the same flop before giving up. */
const DEDUPE_ATTEMPTS = 25;

/**
 * Build the question list up front.
 *
 * Repeats of the exact same (combo, flop) pair are retried a bounded number of
 * times — a narrow range like a 4bet range has few combos, so some repetition is
 * unavoidable and not worth failing over. Retries consume the seeded rng, so the
 * session stays reproducible.
 */
export function buildSession(
  heroWeights: ReadonlyMap<Hand, number>,
  config: EquitySessionConfig,
  seed: number,
): EquitySession | null {
  const rng = mulberry32(seed);
  const questions: EquityQuestion[] = [];
  const seen = new Set<string>();
  const handCount = Math.max(MIN_HANDS, Math.min(MAX_HANDS, Math.trunc(config.handCount)));

  for (let i = 0; i < handCount; i++) {
    let question: EquityQuestion | null = null;

    for (let attempt = 0; attempt < DEDUPE_ATTEMPTS; attempt++) {
      const candidate = generateEquityQuestion(
        heroWeights,
        config.heroRangeId,
        config.villainRangeId,
        (rng() * 0x100000000) >>> 0,
      );
      if (!candidate) return null; // Hero's range has nothing to deal.
      const key = `${candidate.hero[0]}-${candidate.hero[1]}@${candidate.flopIndex}`;
      question = candidate;
      if (!seen.has(key)) {
        seen.add(key);
        break;
      }
    }

    if (!question) return null;
    questions.push(question);
  }

  return { config, seed, questions };
}

export interface SessionRow {
  index: number;
  question: EquityQuestion;
  /** What the user entered, or null if they scrolled past without guessing. */
  guess: number | null;
  /** Computed equity as a percentage, or null if it is still being solved. */
  actual: number | null;
  /** Null when there is no guess or no answer to grade against. */
  grade: EquityGrade | null;
  /** Set when the solver failed for this hand. */
  error: string | null;
}

export interface SessionSummary {
  rows: SessionRow[];
  /** Hands with both a guess and a computed answer. */
  graded: number;
  /** Hands the user scrolled past without guessing. */
  skipped: number;
  /** Hands still waiting on the solver. */
  pending: number;
  correct: number;
  /** Mean |guess - actual| over graded hands, in percentage points. */
  averageAbsoluteError: number;
  /** Mean signed error: positive means the user over-estimates. */
  averageBias: number;
  /** Largest miss, or null if nothing is graded yet. */
  worst: SessionRow | null;
}

/**
 * Grade the whole session at once. This is the only place equities are turned
 * into verdicts — during the drill the numbers are deliberately not shown.
 */
export function summarizeSession(
  session: EquitySession,
  guesses: readonly (number | null)[],
  equities: readonly (EquityResult | null)[],
  errors: readonly (string | null)[] = [],
): SessionSummary {
  const rows: SessionRow[] = session.questions.map((question, index) => {
    const guess = guesses[index] ?? null;
    const result = equities[index] ?? null;
    const actual = result ? result.equity * 100 : null;
    const grade =
      guess !== null && actual !== null
        ? gradeEquityGuess(guess, actual, session.config.tolerance)
        : null;
    return { index, question, guess, actual, grade, error: errors[index] ?? null };
  });

  const gradedRows = rows.filter((row) => row.grade !== null);
  const totalAbsolute = gradedRows.reduce((sum, row) => sum + (row.grade?.absoluteError ?? 0), 0);
  const totalSigned = gradedRows.reduce((sum, row) => sum + (row.grade?.error ?? 0), 0);

  let worst: SessionRow | null = null;
  for (const row of gradedRows) {
    if (!worst || (row.grade?.absoluteError ?? 0) > (worst.grade?.absoluteError ?? 0)) worst = row;
  }

  return {
    rows,
    graded: gradedRows.length,
    skipped: rows.filter((row) => row.guess === null).length,
    pending: rows.filter((row) => row.guess !== null && row.actual === null && !row.error).length,
    correct: gradedRows.filter((row) => row.grade?.correct).length,
    averageAbsoluteError: gradedRows.length === 0 ? 0 : totalAbsolute / gradedRows.length,
    averageBias: gradedRows.length === 0 ? 0 : totalSigned / gradedRows.length,
    worst,
  };
}
