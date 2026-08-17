/**
 * Server-side loading of `ranges/ranges.json`.
 *
 * The file is 165 KB and is parsed once into a module-level singleton, never
 * per question (see CLAUDE.md). Only the 179 raw range strings are handed to the
 * client (~31 KB, 6.5 KB gzipped) — expanding them to hand/weight maps is the
 * client's job, done lazily for the two ranges actually selected.
 *
 * Read at runtime rather than imported so a fresh export of the file is picked
 * up by a server restart, without a rebuild.
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import { type RangeEntry, type RangeNode, collectRanges } from "./tree";

let cached: RangeEntry[] | null = null;

export function loadRangeEntries(): RangeEntry[] {
  if (cached) return cached;

  const file = path.join(process.cwd(), "ranges", "ranges.json");
  const root = JSON.parse(readFileSync(file, "utf8")) as RangeNode;
  cached = collectRanges(root);
  return cached;
}

export function findRangeEntry(id: string): RangeEntry | undefined {
  return loadRangeEntries().find((entry) => entry.id === id);
}
