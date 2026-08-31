"use client";

import { PlayingCard } from "@/components/PlayingCard";
import { type RangeAction } from "@/lib/quiz/rangeQuiz";

interface RangeQuestionCardProps {
  question: { hero: [number, number]; hand: string };
  index: number;
  total: number;
  rangeLabel: string;
  /** Set once the answer is locked in — never graded on screen. */
  answer: RangeAction | null;
  onSubmit: (answer: RangeAction) => void;
  onSkip: () => void;
}

/** Raise / Freq raise / Fold, in strength order. */
const CHOICES: { action: RangeAction; label: string; hint: string; className: string }[] = [
  {
    action: "raise",
    label: "Raise",
    hint: "always",
    className: "border-emerald-500 text-emerald-700 active:bg-emerald-50 dark:text-emerald-300 dark:active:bg-emerald-950/40",
  },
  {
    action: "freq",
    label: "Freq raise",
    hint: "sometimes",
    className: "border-amber-500 text-amber-700 active:bg-amber-50 dark:text-amber-300 dark:active:bg-amber-950/40",
  },
  {
    action: "fold",
    label: "Fold",
    hint: "never",
    className: "border-zinc-400 text-zinc-600 active:bg-zinc-100 dark:text-zinc-300 dark:active:bg-zinc-800/60",
  },
];

/**
 * One hand in the scroll feed. Deliberately shows no feedback after an answer:
 * results are revealed only in the session summary.
 */
export function RangeQuestionCard({
  question,
  index,
  total,
  rangeLabel,
  answer,
  onSubmit,
  onSkip,
}: RangeQuestionCardProps) {
  const locked = answer !== null;
  const lockedChoice = CHOICES.find((choice) => choice.action === answer);

  return (
    <section className="flex h-[100dvh] snap-start flex-col justify-center px-4 py-6">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <p className="text-center text-xs font-medium uppercase tracking-wide text-zinc-400">
          Hand {index + 1} of {total}
        </p>

        <div className="flex flex-col items-center gap-2">
          <div className="flex gap-2">
            <PlayingCard card={question.hero[0]} />
            <PlayingCard card={question.hero[1]} />
          </div>
          <p className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
            {question.hand}
          </p>
          <p className="max-w-[18rem] text-center text-xs text-zinc-500 dark:text-zinc-400">
            {rangeLabel}
          </p>
        </div>

        {locked ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-zinc-200 px-4 py-5 dark:border-zinc-800">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Locked in</p>
            <p className="text-3xl font-semibold">{lockedChoice?.label ?? "—"}</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              Scroll up for the next hand
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-3 gap-2">
              {CHOICES.map((choice) => (
                <button
                  key={choice.action}
                  type="button"
                  onClick={() => onSubmit(choice.action)}
                  className={`flex flex-col items-center gap-0.5 rounded-xl border-2 py-4 text-base font-medium ${choice.className}`}
                >
                  {choice.label}
                  <span className="text-[10px] font-normal uppercase tracking-wide opacity-70">
                    {choice.hint}
                  </span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={onSkip}
              className="text-sm text-zinc-400 underline dark:text-zinc-500"
            >
              Skip this hand
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
