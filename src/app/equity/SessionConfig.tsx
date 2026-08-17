"use client";

import { useState } from "react";

import { RangeGrid } from "@/components/RangeGrid";
import { rangePercent } from "@/lib/ranges/hands";
import { type RangeEntry, entryLabel } from "@/lib/ranges/tree";
import {
  type EquitySessionConfig,
  MAX_HANDS,
  MIN_HANDS,
} from "@/lib/quiz/equitySession";
import type { Hand } from "@/lib/ranges/hands";

interface SessionConfigProps {
  grouped: { group: string; entries: RangeEntry[] }[];
  config: EquitySessionConfig;
  onChange: (config: EquitySessionConfig) => void;
  onStart: () => void;
  heroWeights: ReadonlyMap<Hand, number>;
  villainWeights: ReadonlyMap<Hand, number>;
  heroEntry: RangeEntry | undefined;
  villainEntry: RangeEntry | undefined;
  error: string | null;
}

export function SessionConfig({
  grouped,
  config,
  onChange,
  onStart,
  heroWeights,
  villainWeights,
  heroEntry,
  villainEntry,
  error,
}: SessionConfigProps) {
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
        <h1 className="text-xl font-semibold tracking-tight">Equity session</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Pick both ranges, then scroll through the hands. Results come at the end.
        </p>
      </header>

      <RangeSelect
        label="Your range"
        value={config.heroRangeId}
        onChange={(heroRangeId) => onChange({ ...config, heroRangeId })}
        grouped={grouped}
        percent={rangePercent(heroWeights)}
        entry={heroEntry}
      />

      <RangeSelect
        label="Villain's range"
        value={config.villainRangeId}
        onChange={(villainRangeId) => onChange({ ...config, villainRangeId })}
        grouped={grouped}
        percent={rangePercent(villainWeights)}
        entry={villainEntry}
      />

      <div className="grid grid-cols-2 gap-3">
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
                onChange({
                  ...config,
                  handCount: Math.max(MIN_HANDS, Math.min(MAX_HANDS, next)),
                });
              }
            }}
            className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 tabular-nums dark:border-zinc-700"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-600 dark:text-zinc-300">Tolerance ±pts</span>
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

      {/* Rendered on demand: two 169-cell grids double the page's HTML. */}
      <button
        type="button"
        onClick={() => setShowPreview((shown) => !shown)}
        className="self-start text-sm text-zinc-500 underline dark:text-zinc-400"
      >
        {showPreview ? "Hide ranges" : "Preview ranges"}
      </button>

      {showPreview && (
        <div className="flex flex-col gap-4">
          <RangeGrid
            weights={heroWeights}
            caption={`You — ${heroEntry ? entryLabel(heroEntry) : "?"}`}
          />
          <RangeGrid
            weights={villainWeights}
            caption={`Villain — ${villainEntry ? entryLabel(villainEntry) : "?"}`}
          />
        </div>
      )}
    </form>
  );
}

interface RangeSelectProps {
  label: string;
  value: string;
  onChange: (id: string) => void;
  grouped: { group: string; entries: RangeEntry[] }[];
  percent: number;
  entry: RangeEntry | undefined;
}

function RangeSelect({ label, value, onChange, grouped, percent, entry }: RangeSelectProps) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="flex items-baseline justify-between">
        <span className="text-zinc-600 dark:text-zinc-300">{label}</span>
        <span className="tabular-nums text-zinc-400">{percent.toFixed(1)}% of hands</span>
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
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
      {entry && (
        <span className="text-xs text-zinc-400 dark:text-zinc-500">{entry.group}</span>
      )}
    </label>
  );
}
