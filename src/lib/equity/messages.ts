/**
 * Worker protocol. Kept in its own module so the client can import the types
 * without pulling the worker's `self`-touching entry point into the page bundle.
 */

import type { Card } from "../ranges/cards";
import type { Hand } from "../ranges/hands";
import type { EquityResult } from "./equity";

export interface EquityRequest {
  /** Correlates responses with requests; stale replies are dropped. */
  id: number;
  hero: [Card, Card];
  flop: readonly [Card, Card, Card];
  /** Villain's range as hand/weight pairs — a `Map` is rebuilt worker-side. */
  villain: [Hand, number][];
}

export type EquityResponse =
  | { id: number; ok: true; result: EquityResult }
  | { id: number; ok: false; error: string };
