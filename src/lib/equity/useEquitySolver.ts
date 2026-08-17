"use client";

/**
 * Client-side handle on the equity worker, with a main-thread fallback for
 * environments where `Worker` is unavailable or construction fails.
 */

import { useCallback, useEffect, useRef } from "react";

import type { Card } from "../ranges/cards";
import type { Hand } from "../ranges/hands";
import type { EquityResult } from "./equity";
import type { EquityRequest, EquityResponse } from "./messages";

export interface SolveArgs {
  hero: [Card, Card];
  flop: readonly [Card, Card, Card];
  villain: ReadonlyMap<Hand, number>;
}

type Pending = {
  resolve: (result: EquityResult) => void;
  reject: (error: Error) => void;
};

export function useEquitySolver(): (args: SolveArgs) => Promise<EquityResult> {
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef(new Map<number, Pending>());
  const nextIdRef = useRef(1);
  // Null until we have tried; false once construction has failed for good.
  const workerUsableRef = useRef<boolean | null>(null);

  useEffect(() => {
    const pending = pendingRef.current;
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
      pending.clear();
    };
  }, []);

  const ensureWorker = useCallback((): Worker | null => {
    if (workerRef.current) return workerRef.current;
    if (workerUsableRef.current === false) return null;
    if (typeof Worker === "undefined") {
      workerUsableRef.current = false;
      return null;
    }

    try {
      const worker = new Worker(new URL("./equity.worker.ts", import.meta.url));
      worker.addEventListener("message", (event: MessageEvent<EquityResponse>) => {
        const message = event.data;
        const entry = pendingRef.current.get(message.id);
        if (!entry) return; // Superseded by a newer question.
        pendingRef.current.delete(message.id);
        if (message.ok) entry.resolve(message.result);
        else entry.reject(new Error(message.error));
      });
      worker.addEventListener("error", (event) => {
        for (const [, entry] of pendingRef.current) {
          entry.reject(new Error(event.message || "equity worker failed"));
        }
        pendingRef.current.clear();
      });
      workerRef.current = worker;
      workerUsableRef.current = true;
      return worker;
    } catch {
      workerUsableRef.current = false;
      return null;
    }
  }, []);

  return useCallback(
    async ({ hero, flop, villain }: SolveArgs) => {
      const worker = ensureWorker();

      if (!worker) {
        // Same computation, on the main thread. Imported lazily so the page
        // bundle only pays for it when the worker route is unavailable.
        const { equityOf } = await import("./equity");
        return equityOf(hero, flop, villain);
      }

      const id = nextIdRef.current++;
      const request: EquityRequest = { id, hero, flop, villain: [...villain] };

      return new Promise<EquityResult>((resolve, reject) => {
        pendingRef.current.set(id, { resolve, reject });
        worker.postMessage(request);
      });
    },
    [ensureWorker],
  );
}
