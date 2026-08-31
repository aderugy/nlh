"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { EquityResult } from "@/lib/equity/equity";
import { useEquitySolver } from "@/lib/equity/useEquitySolver";
import { parseRange } from "@/lib/ranges/parseRange";
import { type RangeEntry, entryLabel, groupEntries, isHeroGroup } from "@/lib/ranges/tree";
import {
  DEFAULT_BOARDS,
  DEFAULT_HANDS,
  DEFAULT_TOLERANCE,
  type EquitySession,
  type EquitySessionConfig,
  buildSession,
  summarizeSession,
} from "@/lib/quiz/equitySession";
import { normalizeFlopInput } from "@/lib/quiz/flops";
import { randomSeed } from "@/lib/rng";

import { QuestionCard } from "./QuestionCard";
import { SessionConfig } from "./SessionConfig";
import { SessionResults } from "./SessionResults";

interface EquityQuizProps {
  ranges: RangeEntry[];
}

export function EquityQuiz({ ranges }: EquityQuizProps) {
  const grouped = useMemo(() => groupEntries(ranges), [ranges]);
  const byId = useMemo(() => new Map(ranges.map((entry) => [entry.id, entry])), [ranges]);

  const [config, setConfig] = useState<EquitySessionConfig>(() => ({
    heroRangeId: ranges.find((entry) => isHeroGroup(entry.group))?.id ?? ranges[0]?.id ?? "",
    villainRangeId: ranges.find((entry) => !isHeroGroup(entry.group))?.id ?? ranges[0]?.id ?? "",
    tolerance: DEFAULT_TOLERANCE,
    handCount: DEFAULT_HANDS,
    boards: [...DEFAULT_BOARDS],
  }));
  const [configError, setConfigError] = useState<string | null>(null);

  /**
   * The full pool of boards on offer — the 15 typical flops plus any the user
   * has added. Which of these are actually dealt is `config.boards`; this list
   * lives above the config so a custom board survives reconfiguring between
   * sessions. `addBoardError` reports a rejected custom-flop entry.
   */
  const [availableBoards, setAvailableBoards] = useState<string[]>(() => [...DEFAULT_BOARDS]);
  const [addBoardError, setAddBoardError] = useState<string | null>(null);

  const toggleBoard = useCallback((code: string) => {
    setConfig((current) => {
      const selected = current.boards.includes(code)
        ? current.boards.filter((board) => board !== code)
        : [...current.boards, code];
      return { ...current, boards: selected };
    });
  }, []);

  const setAllBoards = useCallback((selected: boolean) => {
    setConfig((current) => ({ ...current, boards: selected ? [...availableBoards] : [] }));
  }, [availableBoards]);

  const addBoard = useCallback((raw: string) => {
    const code = normalizeFlopInput(raw);
    if (code === null) {
      setAddBoardError('Enter a valid flop — three distinct cards, e.g. "Ah Ks 7d".');
      return;
    }
    setAddBoardError(null);
    setAvailableBoards((list) => (list.includes(code) ? list : [...list, code]));
    setConfig((current) =>
      current.boards.includes(code) ? current : { ...current, boards: [...current.boards, code] },
    );
  }, []);

  const [session, setSession] = useState<EquitySession | null>(null);
  const [guesses, setGuesses] = useState<(number | null)[]>([]);
  const [equities, setEquities] = useState<(EquityResult | null)[]>([]);
  const [solveErrors, setSolveErrors] = useState<(string | null)[]>([]);

  const heroEntry = byId.get(config.heroRangeId);
  const villainEntry = byId.get(config.villainRangeId);
  const heroWeights = useMemo(() => parseRange(heroEntry?.range ?? ""), [heroEntry]);
  const villainWeights = useMemo(() => parseRange(villainEntry?.range ?? ""), [villainEntry]);

  const solve = useEquitySolver();
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);

  const start = useCallback(
    (withConfig: EquitySessionConfig) => {
      if (withConfig.boards.length === 0) {
        setConfigError("Pick at least one board to deal from.");
        return;
      }
      const heroRange = parseRange(byId.get(withConfig.heroRangeId)?.range ?? "");
      const built = buildSession(heroRange, withConfig, randomSeed());
      if (!built) {
        setConfigError("That range has no hands to deal — pick another.");
        return;
      }
      setConfigError(null);
      setGuesses(new Array(built.questions.length).fill(null));
      setEquities(new Array(built.questions.length).fill(null));
      setSolveErrors(new Array(built.questions.length).fill(null));
      sectionRefs.current = new Array(built.questions.length + 1).fill(null);
      setSession(built);
    },
    [byId],
  );

  /**
   * Solve the whole session in the background, in order, while the user drills.
   * Nothing here reaches the screen until the summary — this only makes sure the
   * answers are ready by the time they get there.
   */
  useEffect(() => {
    if (!session) return;
    let cancelled = false;

    void (async () => {
      for (let index = 0; index < session.questions.length; index++) {
        if (cancelled) return;
        const question = session.questions[index];
        try {
          const result = await solve({
            hero: question.hero,
            flop: question.flop,
            villain: villainWeights,
          });
          if (cancelled) return;
          setEquities((current) => {
            const next = [...current];
            next[index] = result;
            return next;
          });
        } catch (cause) {
          if (cancelled) return;
          const message = cause instanceof Error ? cause.message : "solver failed";
          setSolveErrors((current) => {
            const next = [...current];
            next[index] = message;
            return next;
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session, solve, villainWeights]);

  const scrollTo = useCallback((index: number) => {
    sectionRefs.current[index]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const answer = useCallback(
    (index: number, guess: number) => {
      setGuesses((current) => {
        const next = [...current];
        next[index] = guess;
        return next;
      });
      // TikTok-style: locking in carries you to the next hand.
      window.setTimeout(() => scrollTo(index + 1), 200);
    },
    [scrollTo],
  );

  const summary = useMemo(
    () => (session ? summarizeSession(session, guesses, equities, solveErrors) : null),
    [session, guesses, equities, solveErrors],
  );

  if (!session || !summary) {
    return (
      <SessionConfig
        grouped={grouped}
        config={config}
        onChange={setConfig}
        onStart={() => start(config)}
        heroWeights={heroWeights}
        villainWeights={villainWeights}
        heroEntry={heroEntry}
        villainEntry={villainEntry}
        error={configError}
        availableBoards={availableBoards}
        onToggleBoard={toggleBoard}
        onAddBoard={addBoard}
        onSetAllBoards={setAllBoards}
        addBoardError={addBoardError}
      />
    );
  }

  const villainLabel = villainEntry ? entryLabel(villainEntry) : "villain";
  const answered = guesses.filter((guess) => guess !== null).length;

  return (
    <div className="relative flex-1">
      <div className="pointer-events-none fixed inset-x-0 top-0 z-10 flex justify-center p-2">
        <span className="rounded-full bg-zinc-900/80 px-3 py-1 text-xs font-medium tabular-nums text-white backdrop-blur dark:bg-zinc-100/80 dark:text-zinc-900">
          {answered}/{session.questions.length} locked in
        </span>
      </div>

      <div className="h-[100dvh] snap-y snap-mandatory overflow-y-auto overscroll-y-contain">
        {session.questions.map((question, index) => (
          <div
            key={`${question.seed}-${index}`}
            ref={(node) => {
              sectionRefs.current[index] = node;
            }}
          >
            <QuestionCard
              question={question}
              index={index}
              total={session.questions.length}
              villainLabel={villainLabel}
              guess={guesses[index] ?? null}
              onSubmit={(guess) => answer(index, guess)}
              onSkip={() => scrollTo(index + 1)}
            />
          </div>
        ))}

        <div
          ref={(node) => {
            sectionRefs.current[session.questions.length] = node;
          }}
        >
          <SessionResults
            summary={summary}
            tolerance={session.config.tolerance}
            onRestart={() => start(session.config)}
            onReconfigure={() => setSession(null)}
          />
        </div>
      </div>
    </div>
  );
}
