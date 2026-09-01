"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import { MATH_TOPICS } from "@/lib/quiz/mathQuiz";
import {
  DEFAULT_HANDS,
  DEFAULT_TOLERANCE,
  type MathSession,
  type MathSessionConfig,
  buildMathSession,
  summarizeMathSession,
} from "@/lib/quiz/mathSession";
import { randomSeed } from "@/lib/rng";

import { MathQuestionCard } from "./MathQuestionCard";
import { MathSessionConfig as ConfigForm } from "./MathSessionConfig";
import { MathSessionResults } from "./MathSessionResults";

export function MathQuiz() {
  const [config, setConfig] = useState<MathSessionConfig>(() => ({
    topics: [...MATH_TOPICS],
    handCount: DEFAULT_HANDS,
    tolerance: DEFAULT_TOLERANCE,
  }));
  const [configError, setConfigError] = useState<string | null>(null);

  const [session, setSession] = useState<MathSession | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>([]);

  const sectionRefs = useRef<(HTMLElement | null)[]>([]);

  const start = useCallback((withConfig: MathSessionConfig) => {
    if (withConfig.topics.length === 0) {
      setConfigError("Choisis au moins un thème.");
      return;
    }
    const built = buildMathSession(withConfig, randomSeed());
    if (!built) {
      setConfigError("Choisis au moins un thème.");
      return;
    }
    setConfigError(null);
    setAnswers(new Array(built.questions.length).fill(null));
    sectionRefs.current = new Array(built.questions.length + 1).fill(null);
    setSession(built);
  }, []);

  const scrollTo = useCallback((index: number) => {
    sectionRefs.current[index]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const answer = useCallback(
    (index: number, raw: number) => {
      setAnswers((current) => {
        const next = [...current];
        next[index] = raw;
        return next;
      });
      window.setTimeout(() => scrollTo(index + 1), 200);
    },
    [scrollTo],
  );

  const summary = useMemo(
    () => (session ? summarizeMathSession(session, answers) : null),
    [session, answers],
  );

  if (!session || !summary) {
    return (
      <ConfigForm
        config={config}
        onChange={setConfig}
        onStart={() => start(config)}
        error={configError}
      />
    );
  }

  const answered = answers.filter((raw) => raw !== null).length;

  return (
    <div className="relative flex-1">
      <div className="pointer-events-none fixed inset-x-0 top-0 z-10 flex justify-center p-2">
        <span className="rounded-full bg-zinc-900/80 px-3 py-1 text-xs font-medium tabular-nums text-white backdrop-blur dark:bg-zinc-100/80 dark:text-zinc-900">
          {answered}/{session.questions.length} validées
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
            <MathQuestionCard
              question={question}
              index={index}
              total={session.questions.length}
              answer={answers[index] ?? null}
              onSubmit={(raw) => answer(index, raw)}
              onSkip={() => scrollTo(index + 1)}
            />
          </div>
        ))}

        <div
          ref={(node) => {
            sectionRefs.current[session.questions.length] = node;
          }}
        >
          <MathSessionResults
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
