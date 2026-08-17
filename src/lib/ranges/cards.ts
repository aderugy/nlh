/**
 * Card model. A card is an integer 0..51 encoded as `rank * 4 + suit`, so
 * `rank = card >> 2` and `suit = card & 3`. Rank 0 is a deuce, rank 12 an ace.
 *
 * Pure module: no React, no `next/*` imports (see CLAUDE.md).
 */

export type Card = number;

export const RANK_CHARS = "23456789TJQKA";
export const SUIT_CHARS = "cdhs";
export const SUIT_SYMBOLS = ["♣", "♦", "♥", "♠"] as const;

export const RANK_COUNT = 13;
export const SUIT_COUNT = 4;
export const DECK_SIZE = 52;

/** Rank indices high to low — the order the 13x13 hand grid is laid out in. */
export const RANKS_DESC: readonly number[] = [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0];

export function makeCard(rank: number, suit: number): Card {
  return rank * 4 + suit;
}

export function rankOf(c: Card): number {
  return c >> 2;
}

export function suitOf(c: Card): number {
  return c & 3;
}

/** `12 -> "A"`. */
export function rankChar(rank: number): string {
  return RANK_CHARS[rank] ?? "?";
}

/** Rank index for a notation character, or -1 if it is not a rank. */
export function rankIndex(ch: string): number {
  return RANK_CHARS.indexOf(ch.toUpperCase());
}

/** `"As"` style code, the inverse of {@link parseCard}. */
export function cardCode(c: Card): string {
  return rankChar(rankOf(c)) + SUIT_CHARS[suitOf(c)];
}

/** `"A♠"` style label for display. */
export function cardLabel(c: Card): string {
  return rankChar(rankOf(c)) + SUIT_SYMBOLS[suitOf(c)];
}

/** Diamonds and hearts, for the two-colour deck used in the UI. */
export function isRedSuit(suit: number): boolean {
  return suit === 1 || suit === 2;
}

export function parseCard(code: string): Card | null {
  if (code.length !== 2) return null;
  const rank = rankIndex(code[0]);
  const suit = SUIT_CHARS.indexOf(code[1].toLowerCase());
  if (rank < 0 || suit < 0) return null;
  return makeCard(rank, suit);
}
