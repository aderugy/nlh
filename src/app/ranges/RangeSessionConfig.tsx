"use client";

import { useState } from "react";

import { RangeGrid } from "@/components/RangeGrid";
import { rangePercent } from "@/lib/ranges/hands";
import type { Hand } from "@/lib/ranges/hands";
import { type RangeEntry, entryLabel } from "@/lib/ranges/tree";
import { MAX_HANDS, MIN_HANDS, type RangeSessionConfig } from "@/lib/quiz/rangeSession";

interface RangeSessionConfigProps {
  grouped: { group: string; entries: RangeEntry[] }[];
  config: RangeSessionConfig;
  onChange: (config: RangeSessionConfig) => void;
  onStart: () => void;
  weights: ReadonlyMap<Hand, number>;
  entry: RangeEntry | undefined;
  error: string | null;
}

export function RangeSessionConfig({
  grouped,
  config,
  onChange,
  onStart,
  weights,
  entry,
  error,
}: RangeSessionConfigProps) {
  const [showPreview, setShowPreview] = useState(false);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onStart();
      }}
      className="mx-auto flex w-full max-w-md flex-col gap-5 px-4 py-6"
    >
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Range session</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Pick a range, then classify each hand. Results come at the end.
        </p>
      </header>

      <label className="flex flex-col gap-1 text-sm">
        <span className="flex items-baseline justify-between">
          <span className="text-zinc-600 dark:text-zinc-300">Range to drill</span>
          <span className="tabular-nums text-zinc-400">{rangePercent(weights).toFixed(1)}% of hands</span>
        </span>
        <select
          value={config.rangeId}
          onChange={(event) => onChange({ ...config, rangeId: event.target.value })}
          className="rounded-md border border-zinc-300 bg-transparent px-2 py-2 dark:border-zinc-700"
        >
          {grouped.map(({ group, entries }) => (
            <optgroup key={group} label={group}>
              {entries.map((option) => (
                <option key={option.id} value={option.id}>
                  {entryLabel(option)}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        {entry && <span className="text-xs text-zinc-400 dark:text-zinc-500">{entry.group}</span>}
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-zinc-600 dark:text-zinc-300">Hands</span>
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

      <div className="flex flex-col gap-1.5 rounded-xl border border-zinc-200 px-4 py-3 text-xs dark:border-zinc-800">
        <LegendRow color="text-emerald-600 dark:text-emerald-400" name="Raise" desc="in the range at full weight" />
        <LegendRow color="text-amber-600 dark:text-amber-400" name="Freq raise" desc="a mixed hand — raised only some of the time" />
        <LegendRow color="text-zinc-500 dark:text-zinc-400" name="Fold" desc="not in the range" />
      </div>

      {error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
          {error}
        </p>
      )}

      <button
        type="submit"
        className="rounded-xl bg-emerald-600 px-4 py-3 text-base font-medium text-white active:bg-emerald-700"
      >
        Start session
      </button>

      <button
        type="button"
        onClick={() => setShowPreview((shown) => !shown)}
        className="self-start text-sm text-zinc-500 underline dark:text-zinc-400"
      >
        {showPreview ? "Hide range" : "Preview range"}
      </button>

      {showPreview && (
        <RangeGrid weights={weights} caption={entry ? entryLabel(entry) : "?"} />
      )}
    </form>
  );
}

function LegendRow({ color, name, desc }: { color: string; name: string; desc: string }) {
  return (
    <p className="flex gap-2">
      <span className={`w-20 shrink-0 font-medium ${color}`}>{name}</span>
      <span className="text-zinc-500 dark:text-zinc-400">{desc}</span>
    </p>
  );
}
