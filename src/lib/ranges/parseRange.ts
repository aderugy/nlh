/**
 * Parser for the range strings in `ranges/ranges.json`.
 *
 * The grammar and every quirk handled here are documented in CLAUDE.md. The
 * short version:
 *
 *   - comma-separated tokens: `AA`, `AKs`, `AKo`, `AA-44`, `AKs-A2s`
 *   - a non-pair with no suffix (`AK`) means suited *and* offsuit
 *   - dash runs are always descending in the data, but we accept either order
 *   - weight tags `[50]…[/50]`, `[50%]…[/50%]`, `[50.0000]…[/50.0000]` all mean
 *     "played 50% of the time"
 *   - a tag is open/close *state across the token stream*, not a token prefix:
 *     `[75%]A5s-A3s,K8s-K2s,AQo[/75%]` weights all three tokens
 *   - the closing tag's formatting may differ from the opening one
 *     (`[50%]JJ[/50.00%]`), so the close is matched by position, never by value
 */

import { type Hand, makeHand } from "./hands";
import { RANK_CHARS, rankIndex } from "./cards";

export interface ParsedRange {
  /** hand -> weight in [0, 1]. Untagged hands are 1. */
  weights: Map<Hand, number>;
  /** Anything the parser had to guess about; empty for well-formed input. */
  warnings: string[];
}

const OPEN_TAG = /\[(\d+(?:\.\d+)?)%?\]/y;
const CLOSE_TAG = /\[\/(\d+(?:\.\d+)?)%?\]/y;
const HAND_TOKEN = new RegExp(`([${RANK_CHARS}])([${RANK_CHARS}])([soSO]?)`, "y");

interface TokenSpec {
  hi: number;
  lo: number;
  /** "" means the token carried no suffix: both suited and offsuit. */
  suffix: "" | "s" | "o";
}

/** Keep the wider reading when expansion produces the same hand twice. */
function addHand(weights: Map<Hand, number>, hand: Hand, weight: number): void {
  const previous = weights.get(hand);
  if (previous === undefined || weight > previous) weights.set(hand, weight);
}

function emit(weights: Map<Hand, number>, spec: TokenSpec, weight: number): void {
  const { hi, lo, suffix } = spec;
  if (hi === lo) {
    addHand(weights, makeHand(hi, lo, "pair"), weight);
    return;
  }
  if (suffix === "" || suffix === "s") addHand(weights, makeHand(hi, lo, "suited"), weight);
  if (suffix === "" || suffix === "o") addHand(weights, makeHand(hi, lo, "offsuit"), weight);
}

function expandRun(
  weights: Map<Hand, number>,
  from: TokenSpec,
  to: TokenSpec,
  weight: number,
  warnings: string[],
): void {
  const label = () => `${describe(from)}-${describe(to)}`;

  if (from.suffix !== to.suffix) {
    warnings.push(`run ${label()} mixes suffixes; using "${from.suffix || "both"}"`);
  }

  // Pair run: AA-44.
  if (from.hi === from.lo && to.hi === to.lo) {
    const top = Math.max(from.hi, to.hi);
    const bottom = Math.min(from.hi, to.hi);
    for (let r = top; r >= bottom; r--) {
      addHand(weights, makeHand(r, r, "pair"), weight);
    }
    return;
  }

  // Kicker run with a fixed high card: AKs-A2s, K8s-K2s.
  if (from.hi === to.hi && from.hi !== from.lo && to.hi !== to.lo) {
    const top = Math.max(from.lo, to.lo);
    const bottom = Math.min(from.lo, to.lo);
    for (let r = top; r >= bottom; r--) {
      if (r === from.hi) continue;
      emit(weights, { hi: from.hi, lo: r, suffix: from.suffix }, weight);
    }
    return;
  }

  // Not a shape the editor is known to emit (e.g. a connector run JTs-98s).
  // Take the endpoints rather than silently inventing hands in between.
  warnings.push(`unsupported run ${label()}; kept endpoints only`);
  emit(weights, from, weight);
  emit(weights, to, weight);
}

function describe(spec: TokenSpec): string {
  return RANK_CHARS[spec.hi] + RANK_CHARS[spec.lo] + spec.suffix;
}

function readHandToken(src: string, at: number): { spec: TokenSpec; next: number } | null {
  HAND_TOKEN.lastIndex = at;
  const m = HAND_TOKEN.exec(src);
  if (!m) return null;
  const a = rankIndex(m[1]);
  const b = rankIndex(m[2]);
  const suffix = m[3].toLowerCase() as "" | "s" | "o";
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  // A suffix on a pair is meaningless; drop it rather than reject the token.
  return { spec: { hi, lo, suffix: hi === lo ? "" : suffix }, next: at + m[0].length };
}

export function parseRangeDetailed(source: string): ParsedRange {
  const weights = new Map<Hand, number>();
  const warnings: string[] = [];
  const src = source ?? "";

  let i = 0;
  /** Weight applied to tokens at the current position; 1 outside any tag. */
  let weight = 1;
  let openTags = 0;

  while (i < src.length) {
    const ch = src[i];

    if (ch === "," || ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
      i++;
      continue;
    }

    if (ch === "[") {
      CLOSE_TAG.lastIndex = i;
      const close = CLOSE_TAG.exec(src);
      if (close) {
        // Match by position: the closing value may be formatted differently
        // from the opening one, so its number is deliberately ignored.
        if (openTags === 0) {
          warnings.push(`closing tag ${close[0]} with no open tag`);
        } else {
          openTags--;
        }
        weight = 1;
        i += close[0].length;
        continue;
      }

      OPEN_TAG.lastIndex = i;
      const open = OPEN_TAG.exec(src);
      if (open) {
        if (openTags > 0) warnings.push(`nested weight tag ${open[0]}`);
        const percent = Number.parseFloat(open[1]);
        weight = Number.isFinite(percent) ? Math.min(1, Math.max(0, percent / 100)) : 1;
        openTags++;
        i += open[0].length;
        continue;
      }

      warnings.push(`unrecognised tag at index ${i}`);
      i++;
      continue;
    }

    const first = readHandToken(src, i);
    if (!first) {
      // Skip the whole token rather than each character, so one bad token is
      // one warning.
      let end = i;
      while (end < src.length && src[end] !== "," && src[end] !== "[") end++;
      warnings.push(`unrecognised token "${src.slice(i, end)}" at index ${i}`);
      i = end;
      continue;
    }
    i = first.next;

    if (src[i] === "-") {
      const second = readHandToken(src, i + 1);
      if (second) {
        expandRun(weights, first.spec, second.spec, weight, warnings);
        i = second.next;
        continue;
      }
      warnings.push(`dangling "-" after ${describe(first.spec)}`);
      i++;
    }

    emit(weights, first.spec, weight);
  }

  if (openTags > 0) warnings.push(`${openTags} weight tag(s) never closed`);

  return { weights, warnings };
}

/** hand -> weight in [0, 1] over the 169 canonical hands. */
export function parseRange(source: string): Map<Hand, number> {
  return parseRangeDetailed(source).weights;
}
