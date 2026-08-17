/**
 * The 15 typical flops the equity quiz draws from, one picked at random per
 * question. They are the user's own training set — a fixed board sample that
 * covers the textures worth drilling, not a random flop each time.
 */

import { type Card, parseCard } from "../ranges/cards";

export type Flop = readonly [Card, Card, Card];

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

function parseFlop(code: string): Flop {
  const cards = code.split(" ").map((part) => {
    const card = parseCard(part);
    if (card === null) throw new Error(`bad flop card "${part}" in "${code}"`);
    return card;
  });
  if (cards.length !== 3) throw new Error(`flop "${code}" does not have 3 cards`);
  if (new Set(cards).size !== 3) throw new Error(`flop "${code}" repeats a card`);
  return [cards[0], cards[1], cards[2]];
}

export const TYPICAL_FLOPS: readonly Flop[] = FLOP_CODES.map(parseFlop);

/** `"Ah 8s 4h"` — the notation the flop was authored in. */
export const FLOP_LABELS: readonly string[] = FLOP_CODES;
