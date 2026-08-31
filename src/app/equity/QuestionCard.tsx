"use client";

import { type FormEvent, useState } from "react";

import { PlayingCard } from "@/components/PlayingCard";
import type { EquityQuestion } from "@/lib/quiz/equityQuiz";

interface QuestionCardProps {
  question: EquityQuestion;
  index: number;
  total: number;
  villainLabel: string;
  /** Set once the guess is locked in — the number is never graded on screen. */
  guess: number | null;
  onSubmit: (guess: number) => void;
  onSkip: () => void;
}

/**
 * One hand in the scroll feed. Deliberately shows no feedback after a guess:
 * results are revealed only in the session summary.
 */
export function QuestionCard({
  question,
  index,
  total,
  villainLabel,
  guess,
  onSubmit,
  onSkip,
}: QuestionCardProps) {
  const [text, setText] = useState("50");
  const value = Number.parseFloat(text);
  const valid = Number.isFinite(value) && value >= 0 && value <= 100;
  const locked = guess !== null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!locked && valid) onSubmit(value);
  };

  const nudge = (delta: number) => {
    const base = valid ? value : 50;
    setText(String(Math.min(100, Math.max(0, Math.round((base + delta) * 10) / 10))));
  };

  return (
    <section className="flex h-[100dvh] snap-start flex-col justify-center px-4 py-6">
      <div className="mx-auto flex w-full max-w-md flex-col gap-5">
        <p className="text-center text-xs font-medium uppercase tracking-wide text-zinc-400">
          Hand {index + 1} of {total}
        </p>

        <div className="flex flex-col items-center gap-4">
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex gap-2">
              <PlayingCard card={question.hero[0]} />
              <PlayingCard card={question.hero[1]} />
            </div>
            <p className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
              your hand · {question.hand}
            </p>
          </div>

          <div className="flex flex-col items-center gap-1.5">
            <div className="flex gap-1.5">
              {question.flop.map((card) => (
                <PlayingCard key={card} card={card} small />
              ))}
            </div>
            <p className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
              flop · {question.flopCode}
            </p>
          </div>

          <p className="max-w-[18rem] text-center text-xs text-zinc-500 dark:text-zinc-400">
            vs {villainLabel}
          </p>
        </div>

        {locked ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-zinc-200 px-4 py-5 dark:border-zinc-800">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Locked in</p>
            <p className="text-3xl font-semibold tabular-nums">{guess.toFixed(1)}%</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              Scroll up for the next hand
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-3">
            <label className="flex items-center justify-between text-sm">
              <span className="text-zinc-600 dark:text-zinc-300">Your equity</span>
              <span className="flex items-baseline gap-1">
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={100}
                  step={0.5}
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  className="w-24 rounded-md border border-zinc-300 bg-transparent px-2 py-1 text-right text-lg tabular-nums dark:border-zinc-700"
                />
                <span className="text-zinc-500">%</span>
              </span>
            </label>

            <input
              type="range"
              min={0}
              max={100}
              step={0.5}
              value={valid ? value : 50}
              onChange={(event) => setText(event.target.value)}
              className="w-full accent-emerald-600"
              aria-label="Equity estimate"
            />

            <div className="flex gap-2">
              {[-5, -1, 1, 5].map((delta) => (
                <button
                  key={delta}
                  type="button"
                  onClick={() => nudge(delta)}
                  className="flex-1 rounded-lg border border-zinc-300 py-2 text-sm tabular-nums dark:border-zinc-700"
                >
                  {delta > 0 ? `+${delta}` : delta}
                </button>
              ))}
            </div>

            <button
              type="submit"
              disabled={!valid}
              className="rounded-xl bg-emerald-600 px-4 py-3 text-base font-medium text-white disabled:opacity-50 active:bg-emerald-700"
            >
              Lock in
            </button>

            <button
              type="button"
              onClick={onSkip}
              className="text-sm text-zinc-400 underline dark:text-zinc-500"
            >
              Skip this hand
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
