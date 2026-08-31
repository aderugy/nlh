"use client";

import { PlayingCard } from "@/components/PlayingCard";
import { type RangeAction, actionLabel } from "@/lib/quiz/rangeQuiz";
import type { RangeSessionRow, RangeSessionSummary } from "@/lib/quiz/rangeSession";

interface RangeSessionResultsProps {
  summary: RangeSessionSummary;
  onRestart: () => void;
  onReconfigure: () => void;
}

const BREAKDOWN: RangeAction[] = ["raise", "freq", "fold"];

/** The end-of-session report — the first and only place answers are shown. */
export function RangeSessionResults({ summary, onRestart, onReconfigure }: RangeSessionResultsProps) {
  const { answered, correct, skipped, accuracy, byExpected } = summary;

  return (
    <section className="flex min-h-[100dvh] snap-start flex-col px-4 py-8">
      <div className="mx-auto flex w-full max-w-md flex-col gap-5">
        <header className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold tracking-tight">Session results</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            How well you know this range.
          </p>
        </header>

        <div className="grid grid-cols-3 gap-2 text-center">
          <Tile label="Correct" value={answered === 0 ? "—" : `${correct}/${answered}`} />
          <Tile label="Accuracy" value={answered === 0 ? "—" : `${accuracy.toFixed(0)}%`} />
          <Tile label="Skipped" value={`${skipped}`} />
        </div>

        {answered > 0 && (
          <div className="flex flex-col gap-1.5 rounded-xl border border-zinc-200 px-4 py-3 text-sm dark:border-zinc-800">
            {BREAKDOWN.map((action) => {
              const tally = byExpected[action];
              if (tally.total === 0) return null;
              return (
                <p key={action} className="flex items-baseline justify-between">
                  <span className="text-zinc-600 dark:text-zinc-300">{actionLabel(action)}</span>
                  <span className="tabular-nums text-zinc-500 dark:text-zinc-400">
                    {tally.correct}/{tally.total} right
                  </span>
                </p>
              );
            })}
          </div>
        )}

        <ol className="flex flex-col gap-2">
          {summary.rows.map((row) => (
            <ResultRow key={row.index} row={row} />
          ))}
        </ol>

        <div className="flex flex-col gap-2 pt-2">
          <button
            type="button"
            onClick={onRestart}
            className="rounded-xl bg-emerald-600 px-4 py-3 text-base font-medium text-white active:bg-emerald-700"
          >
            Run it again
          </button>
          <button
            type="button"
            onClick={onReconfigure}
            className="rounded-xl border border-zinc-300 px-4 py-3 text-base font-medium dark:border-zinc-700"
          >
            Change range
          </button>
        </div>
      </div>
    </section>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-zinc-100 px-2 py-3 dark:bg-zinc-800/60">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

const ACTION_TONE: Record<RangeAction, string> = {
  raise: "text-emerald-600 dark:text-emerald-400",
  freq: "text-amber-600 dark:text-amber-400",
  fold: "text-zinc-500 dark:text-zinc-400",
};

function ResultRow({ row }: { row: RangeSessionRow }) {
  const { question, answer, grade } = row;

  const tone =
    grade === null
      ? "border-zinc-200 dark:border-zinc-800"
      : grade.correct
        ? "border-emerald-400 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/30"
        : "border-amber-400 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/30";

  return (
    <li className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${tone}`}>
      <span className="w-5 shrink-0 text-xs tabular-nums text-zinc-400">{row.index + 1}</span>

      <span className="flex shrink-0 gap-1">
        <PlayingCard card={question.hero[0]} small />
        <PlayingCard card={question.hero[1]} small />
      </span>

      <span className="min-w-0 flex-1 text-xs text-zinc-500 dark:text-zinc-400">
        <span className="block tabular-nums">{question.hand}</span>
        {grade && grade.expected === "freq" && (
          <span className="block tabular-nums text-zinc-400 dark:text-zinc-500">
            raised {(grade.weight * 100).toFixed(0)}%
          </span>
        )}
      </span>

      <span className="shrink-0 text-right text-sm">
        {grade === null ? (
          <span className="text-xs text-zinc-400">skipped</span>
        ) : (
          <>
            <span className={`block font-semibold ${ACTION_TONE[grade.expected]}`}>
              {actionLabel(grade.expected)}
            </span>
            {!grade.correct && (
              <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                you {actionLabel(answer as RangeAction).toLowerCase()}
              </span>
            )}
          </>
        )}
      </span>
    </li>
  );
}
