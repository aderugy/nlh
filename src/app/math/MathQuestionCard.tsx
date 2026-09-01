"use client";

import { type FormEvent, useState } from "react";

import { type MathQuestion, POT, TOPIC_META } from "@/lib/quiz/mathQuiz";

interface MathQuestionCardProps {
  question: MathQuestion;
  index: number;
  total: number;
  /** The raw value locked in (a % or a ratio X), or null. Never graded on screen. */
  answer: number | null;
  onSubmit: (raw: number) => void;
  onSkip: () => void;
}

interface Prompt {
  scenario: string;
  ask: string;
}

function promptFor(question: MathQuestion): Prompt {
  const bet = question.sizePct ?? 0;
  switch (question.topic) {
    case "mdf":
      return {
        scenario: `Villain mise ${bet} (${bet} % du pot) dans un pot de ${POT}.`,
        ask: "Quelle est ta MDF ?",
      };
    case "potodds":
      return {
        scenario: `Pot de ${POT}, villain mise ${bet} (${bet} % du pot).`,
        ask: "Quelles cotes as-tu pour payer ?",
      };
    case "bluff":
      return {
        scenario: `Tu mises ${bet} (${bet} % du pot) dans un pot de ${POT}.`,
        ask: "Fréquence de bluff optimale ?",
      };
    case "outs":
      return {
        scenario: `Tu as ${question.outs} outs au flop.`,
        ask: "Tes cotes pour toucher à la turn ?",
      };
  }
}

/**
 * One question in the scroll feed. Shows the scenario and an input matched to
 * the topic — a percentage, or a ratio typed as `X : 1`. No feedback after an
 * answer: results are revealed only in the session summary.
 */
export function MathQuestionCard({
  question,
  index,
  total,
  answer,
  onSubmit,
  onSkip,
}: MathQuestionCardProps) {
  const meta = TOPIC_META[question.topic];
  const isRatio = meta.answerKind === "ratio";
  const [text, setText] = useState("");

  const value = Number.parseFloat(text);
  const valid = isRatio
    ? Number.isFinite(value) && value > 0
    : Number.isFinite(value) && value >= 0 && value <= 100;
  const locked = answer !== null;

  const prompt = promptFor(question);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!locked && valid) onSubmit(value);
  };

  const lockedText = locked ? (isRatio ? `${answer} : 1` : `${answer} %`) : "";

  return (
    <section className="flex h-[100dvh] snap-start flex-col justify-center px-4 py-6">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <p className="text-center text-xs font-medium uppercase tracking-wide text-zinc-400">
          Question {index + 1} / {total}
        </p>

        <div className="flex flex-col items-center gap-2 text-center">
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-500 dark:bg-zinc-800/60 dark:text-zinc-300">
            {meta.label}
          </span>
          <p className="text-lg font-medium text-zinc-800 dark:text-zinc-100">{prompt.scenario}</p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{prompt.ask}</p>
        </div>

        {locked ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-zinc-200 px-4 py-5 dark:border-zinc-800">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Réponse enregistrée</p>
            <p className="text-3xl font-semibold tabular-nums">{lockedText}</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">Scrolle pour la suivante</p>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-3">
            <label className="flex items-center justify-between text-sm">
              <span className="text-zinc-600 dark:text-zinc-300">
                {isRatio ? "Tes cotes" : "Ta réponse"}
              </span>
              <span className="flex items-baseline gap-1">
                <input
                  type="number"
                  inputMode="decimal"
                  autoFocus
                  min={isRatio ? 0 : 0}
                  max={isRatio ? undefined : 100}
                  step={isRatio ? 0.1 : 0.5}
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder={isRatio ? "ex. 3" : "ex. 50"}
                  className="w-24 rounded-md border border-zinc-300 bg-transparent px-2 py-1 text-right text-lg tabular-nums dark:border-zinc-700"
                />
                <span className="w-8 text-zinc-500">{meta.answerHint}</span>
              </span>
            </label>

            <button
              type="submit"
              disabled={!valid}
              className="rounded-xl bg-emerald-600 px-4 py-3 text-base font-medium text-white disabled:opacity-50 active:bg-emerald-700"
            >
              Valider
            </button>

            <button
              type="button"
              onClick={onSkip}
              className="text-sm text-zinc-400 underline dark:text-zinc-500"
            >
              Passer
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
