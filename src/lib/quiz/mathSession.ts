/**
 * Session model for the poker-maths quiz.
 *
 * Same shape as the other quizzes: configured once (which topics, how many
 * hands, a tolerance band), then drilled as a fixed list of questions the user
 * scrolls through, with nothing revealed until the end.
 *
 * Pure and seedable: `(config, seed)` fully determines the whole session.
 * Grading is a pure calculation, so — like the range quiz — there is no
 * background solver: `summarizeMathSession` grades everything at once.
 */

import { mulberry32 } from "../rng";
import {
  type MathGrade,
  type MathQuestion,
  type MathSolution,
  type MathTopic,
  MATH_TOPICS,
  generateMathQuestion,
  gradeMathAnswer,
  questionKey,
  solveMathQuestion,
} from "./mathQuiz";

export interface MathSessionConfig {
  /** Which topics the session draws from. */
  topics: MathTopic[];
  /** How many questions this session deals. */
  handCount: number;
  /** Tolerance band in percentage points — answers within it are correct. */
  tolerance: number;
}

export interface MathSession {
  config: MathSessionConfig;
  seed: number;
  questions: MathQuestion[];
}

export const MIN_HANDS = 1;
export const MAX_HANDS = 100;
export const DEFAULT_HANDS = 15;
export const DEFAULT_TOLERANCE = 3;

/** Attempts to avoid repeating the same scenario before giving up. */
const DEDUPE_ATTEMPTS = 25;

/**
 * Build the question list up front from one seed.
 *
 * Returns null when no topics are selected — there is nothing to deal. Exact
 * repeats are retried a bounded number of times; a topic set with few distinct
 * scenarios (one topic, few sizes) makes some repetition unavoidable, and the
 * retries consume the seeded rng so the session stays reproducible.
 */
export function buildMathSession(config: MathSessionConfig, seed: number): MathSession | null {
  if (config.topics.length === 0) return null;

  const rng = mulberry32(seed);
  const questions: MathQuestion[] = [];
  const seen = new Set<string>();
  const handCount = Math.max(MIN_HANDS, Math.min(MAX_HANDS, Math.trunc(config.handCount)));

  for (let i = 0; i < handCount; i++) {
    let question: MathQuestion | null = null;
    for (let attempt = 0; attempt < DEDUPE_ATTEMPTS; attempt++) {
      const candidate = generateMathQuestion(config.topics, (rng() * 0x100000000) >>> 0);
      if (!candidate) return null;
      question = candidate;
      const key = questionKey(candidate);
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

export interface MathSessionRow {
  index: number;
  question: MathQuestion;
  solution: MathSolution;
  /** The raw number the user entered (a % or a ratio X), or null if skipped. */
  answer: number | null;
  /** Null when there is no answer to grade. */
  grade: MathGrade | null;
}

export interface MathTopicTally {
  total: number;
  correct: number;
}

export interface MathSessionSummary {
  rows: MathSessionRow[];
  answered: number;
  skipped: number;
  correct: number;
  /** Accuracy over answered questions, in percent. */
  accuracy: number;
  /** Mean |answer − correct|, in points, over answered questions. */
  averageAbsoluteError: number;
  /** Correct-vs-total split by topic — where the mistakes are. */
  byTopic: Record<MathTopic, MathTopicTally>;
}

/** Grade the whole session at once. The only place answers are revealed. */
export function summarizeMathSession(
  session: MathSession,
  answers: readonly (number | null)[],
): MathSessionSummary {
  const rows: MathSessionRow[] = session.questions.map((question, index) => {
    const solution = solveMathQuestion(question);
    const answer = answers[index] ?? null;
    const grade = answer !== null ? gradeMathAnswer(solution, answer, session.config.tolerance) : null;
    return { index, question, solution, answer, grade };
  });

  const byTopic = MATH_TOPICS.reduce(
    (acc, topic) => {
      acc[topic] = { total: 0, correct: 0 };
      return acc;
    },
    {} as Record<MathTopic, MathTopicTally>,
  );

  let answered = 0;
  let correct = 0;
  let totalAbsolute = 0;
  for (const row of rows) {
    if (!row.grade) continue;
    answered++;
    totalAbsolute += row.grade.absoluteError;
    const tally = byTopic[row.question.topic];
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
    averageAbsoluteError: answered === 0 ? 0 : totalAbsolute / answered,
    byTopic,
  };
}
