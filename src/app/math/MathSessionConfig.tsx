"use client";

import { MATH_TOPICS, TOPIC_META, type MathTopic } from "@/lib/quiz/mathQuiz";
import { MAX_HANDS, MIN_HANDS, type MathSessionConfig } from "@/lib/quiz/mathSession";

interface MathSessionConfigProps {
  config: MathSessionConfig;
  onChange: (config: MathSessionConfig) => void;
  onStart: () => void;
  error: string | null;
}

/** One-line formula reminder per topic, shown under the picker. */
const FORMULAS: Record<MathTopic, string> = {
  mdf: "MDF = pot / (pot + mise)",
  potodds: "Cotes = (pot + mise) : mise",
  outs: "Outs → turn = (47 − outs) : outs",
  bluff: "Bluff = mise / (pot + 2·mise)",
};

export function MathSessionConfig({ config, onChange, onStart, error }: MathSessionConfigProps) {
  const selected = new Set(config.topics);

  const toggle = (topic: MathTopic) => {
    const next = selected.has(topic)
      ? config.topics.filter((t) => t !== topic)
      : [...config.topics, topic];
    onChange({ ...config, topics: next });
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onStart();
      }}
      className="mx-auto flex w-full max-w-md flex-col gap-5 px-4 py-6"
    >
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Maths au poker</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Choisis les thèmes, puis calcule chaque situation. Le corrigé arrive à la fin.
        </p>
      </header>

      <div className="flex flex-col gap-2">
        <span className="text-sm text-zinc-600 dark:text-zinc-300">Thèmes</span>
        <div className="grid grid-cols-2 gap-2">
          {MATH_TOPICS.map((topic) => {
            const on = selected.has(topic);
            return (
              <button
                key={topic}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(topic)}
                className={[
                  "flex flex-col gap-0.5 rounded-xl border px-3 py-2.5 text-left transition-colors",
                  on
                    ? "border-emerald-500 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/40"
                    : "border-zinc-300 text-zinc-400 dark:border-zinc-700 dark:text-zinc-500",
                ].join(" ")}
              >
                <span className={`text-sm font-medium ${on ? "text-zinc-800 dark:text-zinc-100" : ""}`}>
                  {TOPIC_META[topic].label}
                </span>
                <span className="text-[10px] leading-tight text-zinc-500 dark:text-zinc-400">
                  {FORMULAS[topic]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-600 dark:text-zinc-300">Questions</span>
          <input
            type="number"
            min={MIN_HANDS}
            max={MAX_HANDS}
            step={1}
            value={config.handCount}
            onChange={(event) => {
              const next = Number.parseInt(event.target.value, 10);
              if (Number.isFinite(next)) {
                onChange({ ...config, handCount: Math.max(MIN_HANDS, Math.min(MAX_HANDS, next)) });
              }
            }}
            className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 tabular-nums dark:border-zinc-700"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-600 dark:text-zinc-300">Tolérance ±pts</span>
          <input
            type="number"
            min={0.5}
            max={25}
            step={0.5}
            value={config.tolerance}
            onChange={(event) => {
              const next = Number.parseFloat(event.target.value);
              if (Number.isFinite(next)) {
                onChange({ ...config, tolerance: Math.max(0.5, Math.min(25, next)) });
              }
            }}
            className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 tabular-nums dark:border-zinc-700"
          />
        </label>
      </div>

      <p className="text-xs text-zinc-400 dark:text-zinc-500">
        MDF et fréquence de bluff se répondent en %. Cotes du pot et outs se répondent en ratio, tapé comme «&nbsp;X&nbsp;» pour X:1. La tolérance est comparée en points d&apos;équité.
      </p>

      {error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
          {error}
        </p>
      )}

      <button
        type="submit"
        className="rounded-xl bg-emerald-600 px-4 py-3 text-base font-medium text-white active:bg-emerald-700"
      >
        Commencer
      </button>
    </form>
  );
}
