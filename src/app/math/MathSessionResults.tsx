"use client";

import { type MathTopic, TOPIC_META, questionLabel } from "@/lib/quiz/mathQuiz";
import type { MathSessionRow, MathSessionSummary } from "@/lib/quiz/mathSession";

interface MathSessionResultsProps {
  summary: MathSessionSummary;
  tolerance: number;
  onRestart: () => void;
  onReconfigure: () => void;
}

const TOPIC_ORDER: MathTopic[] = ["mdf", "potodds", "outs", "bluff"];

export function MathSessionResults({
  summary,
  tolerance,
  onRestart,
  onReconfigure,
}: MathSessionResultsProps) {
  const { answered, correct, skipped, accuracy, byTopic } = summary;

  return (
    <section className="flex min-h-[100dvh] snap-start flex-col px-4 py-8">
      <div className="mx-auto flex w-full max-w-md flex-col gap-5">
        <header className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold tracking-tight">Corrigé</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Validé à ±{tolerance} points.
          </p>
        </header>

        <div className="grid grid-cols-3 gap-2 text-center">
          <Tile label="Justes" value={answered === 0 ? "—" : `${correct}/${answered}`} />
          <Tile label="Réussite" value={answered === 0 ? "—" : `${accuracy.toFixed(0)}%`} />
          <Tile label="Passées" value={`${skipped}`} />
        </div>

        {answered > 0 && (
          <div className="flex flex-col gap-1.5 rounded-xl border border-zinc-200 px-4 py-3 text-sm dark:border-zinc-800">
            {TOPIC_ORDER.map((topic) => {
              const tally = byTopic[topic];
              if (tally.total === 0) return null;
              return (
                <p key={topic} className="flex items-baseline justify-between">
                  <span className="text-zinc-600 dark:text-zinc-300">{TOPIC_META[topic].label}</span>
                  <span className="tabular-nums text-zinc-500 dark:text-zinc-400">
                    {tally.correct}/{tally.total} justes
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
            Recommencer
          </button>
          <button
            type="button"
            onClick={onReconfigure}
            className="rounded-xl border border-zinc-300 px-4 py-3 text-base font-medium dark:border-zinc-700"
          >
            Changer les thèmes
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

/** Format the correct answer in its native form. */
function correctText(row: MathSessionRow): string {
  const { solution } = row;
  return solution.answerKind === "ratio"
    ? `${(solution.ratioX ?? 0).toFixed(1)} : 1`
    : `${solution.valuePercent.toFixed(1)} %`;
}

/** Format the user's raw answer in the same form. */
function answerText(row: MathSessionRow): string {
  if (row.answer === null) return "passée";
  return row.solution.answerKind === "ratio" ? `${row.answer} : 1` : `${row.answer} %`;
}

function ResultRow({ row }: { row: MathSessionRow }) {
  const { grade } = row;

  const tone =
    grade === null
      ? "border-zinc-200 dark:border-zinc-800"
      : grade.correct
        ? "border-emerald-400 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/30"
        : "border-amber-400 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/30";

  return (
    <li className={`flex flex-col gap-1 rounded-xl border px-3 py-2 ${tone}`}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
          {row.index + 1}. {questionLabel(row.question)}
        </span>
        <span className="shrink-0 text-right text-sm tabular-nums">
          <span className="font-semibold text-emerald-700 dark:text-emerald-300">
            {correctText(row)}
          </span>
          {grade !== null && !grade.correct && (
            <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
              toi&nbsp;{answerText(row)}
            </span>
          )}
          {grade === null && (
            <span className="ml-2 text-xs text-zinc-400">passée</span>
          )}
        </span>
      </div>
      <p className="text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">
        {row.solution.explanation}
      </p>
    </li>
  );
}
