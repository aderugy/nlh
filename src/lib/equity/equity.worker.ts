/// <reference lib="webworker" />

/**
 * Runs the runout enumeration off the main thread. Exact flop equity is a few
 * hundred thousand hand evaluations for a wide range, which would visibly jank
 * the UI on a phone if it ran inline.
 */

import { equityOf } from "./equity";
import type { EquityRequest, EquityResponse } from "./messages";

self.addEventListener("message", (event: MessageEvent<EquityRequest>) => {
  const request = event.data;
  try {
    const result = equityOf(request.hero, request.flop, new Map(request.villain));
    const response: EquityResponse = { id: request.id, ok: true, result };
    self.postMessage(response);
  } catch (error) {
    const response: EquityResponse = {
      id: request.id,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
    self.postMessage(response);
  }
});
