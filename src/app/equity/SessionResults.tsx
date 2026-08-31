"use client";

import { PlayingCard } from "@/components/PlayingCard";
import type { SessionRow, SessionSummary } from "@/lib/quiz/equitySession";

interface SessionResultsProps {
  summary: SessionSummary;
  tolerance: number;
  onRestart: () => void;
  onReconfigure: () => void;
}

/** The end-of-session report — the first and only place answers are shown. */
export function SessionResults({
  summary,
  tolerance,
  onRestart,
  onReconfigure,
}: SessionResultsProps) {
  const { graded, correct, skipped, pending } = summary;
  const accuracy = graded === 0 ? 0 : (correct / graded) * 100;

  return (
    <section className="flex min-h-[100dvh] snap-start flex-col px-4 py-8">
      <div className="mx-auto flex w-full max-w-md flex-col gap-5">
        <header className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold tracking-tight">Session results</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Graded within ±{tolerance} points.
          </p>
        </header>

        {pending > 0 && (
          <p className="rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300">
            Still solving {pending} hand{pending === 1 ? "" : "s"}…
          </p>
        )}

        <div className="grid grid-cols-3 gap-2 text-center">
          <Tile label="Within band" value={graded === 0 ? "—" : `${correct}/${graded}`} />
          <Tile label="Accuracy" value={graded === 0 ? "—" : `${accuracy.toFixed(0)}%`} />
          <Tile
            label="Avg off by"
            value={graded === 0 ? "—" : `${summary.averageAbsoluteError.toFixed(1)}`}
          />
        </div>

        {graded > 0 && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {Math.abs(summary.averageBias) < 1
              ? "No systematic bias — your misses go both ways."
              : summary.averageBias > 0
                ? `You over-estimate by ${summary.averageBias.toFixed(1)} points on average.`
                : `You under-estimate by ${Math.abs(summary.averageBias).toFixed(1)} points on average.`}
            {skipped > 0 && ` ${skipped} hand${skipped === 1 ? "" : "s"} skipped.`}
          </p>
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
            Change ranges
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

function ResultRow({ row }: { row: SessionRow }) {
  const { question, guess, actual, grade, error } = row;

  const tone = error
    ? "border-rose-300 dark:border-rose-900"
    : grade === null
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
        <span className="block tabular-nums">{question.flopCode}</span>
        <span className="block tabular-nums text-zinc-400 dark:text-zinc-500">
          {question.hand}
        </span>
      </span>

      <span className="shrink-0 text-right text-sm tabular-nums">
        {error ? (
          <span className="text-xs text-rose-600 dark:text-rose-400">failed</span>
        ) : (
          <>
            <span className="block font-semibold">
              {actual === null ? "…" : `${actual.toFixed(1)}%`}
            </span>
            <span className="block text-xs text-zinc-500 dark:text-zinc-400">
              {guess === null ? (
                "skipped"
              ) : (
                <>
                  you {guess.toFixed(1)}
                  {grade && (
                    <span className={grade.correct ? "text-emerald-600" : "text-amber-600"}>
                      {" "}
                      ({grade.error > 0 ? "+" : ""}
                      {grade.error.toFixed(1)})
                    </span>
                  )}
                </>
              )}
            </span>
          </>
        )}
      </span>
    </li>
  );
}
