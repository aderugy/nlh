"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import { parseRange } from "@/lib/ranges/parseRange";
import { type RangeEntry, entryLabel, groupEntries } from "@/lib/ranges/tree";
import { type RangeAction } from "@/lib/quiz/rangeQuiz";
import {
  DEFAULT_HANDS,
  type RangeSession,
  type RangeSessionConfig,
  buildRangeSession,
  summarizeRangeSession,
} from "@/lib/quiz/rangeSession";
import { randomSeed } from "@/lib/rng";

import { RangeQuestionCard } from "./RangeQuestionCard";
import { RangeSessionConfig as ConfigForm } from "./RangeSessionConfig";
import { RangeSessionResults } from "./RangeSessionResults";

interface RangeQuizProps {
  ranges: RangeEntry[];
}

export function RangeQuiz({ ranges }: RangeQuizProps) {
  const grouped = useMemo(() => groupEntries(ranges), [ranges]);
  const byId = useMemo(() => new Map(ranges.map((entry) => [entry.id, entry])), [ranges]);

  const [config, setConfig] = useState<RangeSessionConfig>(() => ({
    rangeId: ranges[0]?.id ?? "",
    handCount: DEFAULT_HANDS,
  }));
  const [configError, setConfigError] = useState<string | null>(null);

  const [session, setSession] = useState<RangeSession | null>(null);
  const [answers, setAnswers] = useState<(RangeAction | null)[]>([]);

  const entry = byId.get(config.rangeId);
  const weights = useMemo(() => parseRange(entry?.range ?? ""), [entry]);

  const sectionRefs = useRef<(HTMLElement | null)[]>([]);

  const start = useCallback(
    (withConfig: RangeSessionConfig) => {
      if (!byId.get(withConfig.rangeId)) {
        setConfigError("Pick a range to drill.");
        return;
      }
      setConfigError(null);
      const built = buildRangeSession(withConfig, randomSeed());
      setAnswers(new Array(built.questions.length).fill(null));
      sectionRefs.current = new Array(built.questions.length + 1).fill(null);
      setSession(built);
    },
    [byId],
  );

  const scrollTo = useCallback((index: number) => {
    sectionRefs.current[index]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const answer = useCallback(
    (index: number, choice: RangeAction) => {
      setAnswers((current) => {
        const next = [...current];
        next[index] = choice;
        return next;
      });
      // TikTok-style: locking in carries you to the next hand.
      window.setTimeout(() => scrollTo(index + 1), 200);
    },
    [scrollTo],
  );

  // The session was dealt from the range selected at start; grade against that
  // same range even if the picker has since moved on.
  const sessionWeights = useMemo(
    () => (session ? parseRange(byId.get(session.config.rangeId)?.range ?? "") : weights),
    [session, byId, weights],
  );

  const summary = useMemo(
    () => (session ? summarizeRangeSession(session, answers, sessionWeights) : null),
    [session, answers, sessionWeights],
  );

  if (!session || !summary) {
    return (
      <ConfigForm
        grouped={grouped}
        config={config}
        onChange={setConfig}
        onStart={() => start(config)}
        weights={weights}
        entry={entry}
        error={configError}
      />
    );
  }

  const sessionEntry = byId.get(session.config.rangeId);
  const rangeLabel = sessionEntry ? entryLabel(sessionEntry) : "range";
  const answered = answers.filter((choice) => choice !== null).length;

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
            <RangeQuestionCard
              question={question}
              index={index}
              total={session.questions.length}
              rangeLabel={rangeLabel}
              answer={answers[index] ?? null}
              onSubmit={(choice) => answer(index, choice)}
              onSkip={() => scrollTo(index + 1)}
            />
          </div>
        ))}

        <div
          ref={(node) => {
            sectionRefs.current[session.questions.length] = node;
          }}
        >
          <RangeSessionResults
            summary={summary}
            onRestart={() => start(session.config)}
            onReconfigure={() => setSession(null)}
          />
        </div>
      </div>
    </div>
  );
}
