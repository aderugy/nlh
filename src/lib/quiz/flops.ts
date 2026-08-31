/**
 * Boards the equity quiz draws from.
 *
 * A session deals from a chosen set of flops. By default that set is the 15
 * typical flops below — a fixed sample that covers the textures worth drilling —
 * but the user can narrow it to a single board to train one texture, or add
 * their own flops to the pool (see the equity session config).
 */

import { type Card, cardCode, parseCard } from "../ranges/cards";

export type Flop = readonly [Card, Card, Card];

/** A flop plus its canonical text code, e.g. `{ code: "Ah 8s 4h", flop: [...] }`. */
export interface Board {
  code: string;
  flop: Flop;
}

const FLOP_CODES = [
  "Ah 8s 4h",
  "As 7s 2d",
  "Kh Jc 4c",
  "Kd 9s 7h",
  "Kh 5c 2h",
  "Qd Qc Jh",
  "Qd Th 7d",
  "Qs 8c 6s",
  "Jd 3c 2h",
  "Td 9c 6c",
  "8h 5d 3d",
  "7c 6d 6c",
  "Ad Ts 5h",
  "Td 4d 2d",
  "9d 4h 3c",
] as const;

/**
 * Parse a `"Ah 8s 4h"` code into a flop. Throws on anything that is not three
 * distinct valid cards — callers building from trusted constants want the throw;
 * for user input use {@link normalizeFlopInput}, which returns null instead.
 */
export function parseFlop(code: string): Flop {
  const cards = code.split(/\s+/).filter(Boolean).map((part) => {
    const card = parseCard(part);
    if (card === null) throw new Error(`bad flop card "${part}" in "${code}"`);
    return card;
  });
  if (cards.length !== 3) throw new Error(`flop "${code}" does not have 3 cards`);
  if (new Set(cards).size !== 3) throw new Error(`flop "${code}" repeats a card`);
  return [cards[0], cards[1], cards[2]];
}

/**
 * Canonical text for a flop: the three cards high to low, space-separated
 * (`"Ah 8s 4h"`). Sorting makes the code order-independent, so the same three
 * cards always produce one code — which is what board de-duplication keys on.
 */
export function flopCode(flop: Flop): string {
  return [...flop].sort((a, b) => b - a).map(cardCode).join(" ");
}

/**
 * Parse arbitrary user input into a canonical flop code, or null if it is not a
 * legal flop. Tolerant of the ways a person types three cards: `"Ah Ks 7d"`,
 * `"AhKs7d"`, `"ah, ks, td"`. Returns three distinct valid cards high to low.
 */
export function normalizeFlopInput(input: string): string | null {
  const cleaned = input.trim().toLowerCase().replace(/,/g, " ");
  let tokens = cleaned.split(/\s+/).filter(Boolean);
  // Compact form with no separators, e.g. "ahks7d".
  if (tokens.length === 1 && tokens[0].length === 6) {
    tokens = [tokens[0].slice(0, 2), tokens[0].slice(2, 4), tokens[0].slice(4, 6)];
  }
  if (tokens.length !== 3) return null;
  const cards: Card[] = [];
  for (const token of tokens) {
    const card = parseCard(token);
    if (card === null) return null;
    cards.push(card);
  }
  if (new Set(cards).size !== 3) return null;
  return flopCode([cards[0], cards[1], cards[2]]);
}

/** Build a {@link Board} from a code, or null if the code is not a legal flop. */
export function boardFromCode(code: string): Board | null {
  const normalized = normalizeFlopInput(code);
  if (normalized === null) return null;
  return { code: normalized, flop: parseFlop(normalized) };
}

export const TYPICAL_FLOPS: readonly Flop[] = FLOP_CODES.map(parseFlop);

/** `"Ah 8s 4h"` — the notation the typical flops were authored in. */
export const FLOP_LABELS: readonly string[] = FLOP_CODES;

/** The 15 typical flops as boards — the default pool a session deals from. */
export const TYPICAL_BOARDS: readonly Board[] = FLOP_CODES.map((code) => ({
  code,
  flop: parseFlop(code),
}));
