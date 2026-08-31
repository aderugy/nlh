"use client";

import { useState } from "react";

import { RangeGrid } from "@/components/RangeGrid";
import { isRedSuit, cardLabel, parseCard, suitOf } from "@/lib/ranges/cards";
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
  /** Every board on offer — the 15 typical flops plus any custom ones added. */
  availableBoards: string[];
  onToggleBoard: (code: string) => void;
  onAddBoard: (raw: string) => void;
  onSetAllBoards: (selected: boolean) => void;
  addBoardError: string | null;
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
  availableBoards,
  onToggleBoard,
  onAddBoard,
  onSetAllBoards,
  addBoardError,
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

      <BoardPicker
        boards={availableBoards}
        selected={config.boards}
        onToggle={onToggleBoard}
        onSetAll={onSetAllBoards}
        onAdd={onAddBoard}
        addError={addBoardError}
      />

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

interface BoardPickerProps {
  boards: string[];
  selected: string[];
  onToggle: (code: string) => void;
  onSetAll: (selected: boolean) => void;
  onAdd: (raw: string) => void;
  addError: string | null;
}

/**
 * Choose which flops the session deals from. Every board is a toggle; the
 * session draws uniformly from the selected set, so selecting exactly one board
 * trains that single texture. Custom flops are added to the pool below.
 */
function BoardPicker({ boards, selected, onToggle, onSetAll, onAdd, addError }: BoardPickerProps) {
  const [draft, setDraft] = useState("");
  const selectedSet = new Set(selected);

  const add = () => {
    onAdd(draft);
    setDraft("");
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-zinc-600 dark:text-zinc-300">Boards</span>
        <span className="flex items-center gap-2 text-xs text-zinc-400">
          <span className="tabular-nums">{selected.length} selected</span>
          <button
            type="button"
            onClick={() => onSetAll(true)}
            className="underline hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            All
          </button>
          <button
            type="button"
            onClick={() => onSetAll(false)}
            className="underline hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            None
          </button>
        </span>
      </div>

      <p className="text-xs text-zinc-400 dark:text-zinc-500">
        One flop is drawn at random per hand from the boards you pick. Select a single board to drill it.
      </p>

      <div className="flex flex-wrap gap-1.5">
        {boards.map((code) => {
          const on = selectedSet.has(code);
          return (
            <button
              key={code}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(code)}
              className={[
                "rounded-lg border px-2 py-1.5 text-sm transition-colors",
                on
                  ? "border-emerald-500 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/40"
                  : "border-zinc-300 text-zinc-400 dark:border-zinc-700 dark:text-zinc-500",
              ].join(" ")}
            >
              <FlopText code={code} muted={!on} />
            </button>
          );
        })}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }}
          placeholder="Add a flop, e.g. Ah Ks 7d"
          aria-label="Add a custom flop"
          className="min-w-0 flex-1 rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
        />
        <button
          type="button"
          onClick={add}
          disabled={draft.trim() === ""}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm disabled:opacity-40 dark:border-zinc-700"
        >
          Add
        </button>
      </div>

      {addError && (
        <p className="text-xs text-rose-600 dark:text-rose-400">{addError}</p>
      )}
    </div>
  );
}

/** A flop code rendered with suit symbols and red/black suit colours. */
function FlopText({ code, muted = false }: { code: string; muted?: boolean }) {
  return (
    <span className="inline-flex gap-1 font-medium tabular-nums">
      {code.split(" ").map((token, index) => {
        const card = parseCard(token);
        if (card === null) return <span key={index}>{token}</span>;
        const red = isRedSuit(suitOf(card));
        return (
          <span
            key={index}
            className={
              muted
                ? "text-zinc-400 dark:text-zinc-500"
                : red
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-zinc-800 dark:text-zinc-100"
            }
          >
            {cardLabel(card)}
          </span>
        );
      })}
    </span>
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
