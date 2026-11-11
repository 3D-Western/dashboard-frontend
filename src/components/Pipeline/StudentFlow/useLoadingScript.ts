'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  buildPool,
  loadSeenFacts,
  orderFacts,
  pickNext,
  rememberFact,
  type PreparingCard,
} from '@/lib/preparing-cards';
import {
  LEARN_GAP_MS,
  MAX_LAG_AFTER_READY_MS,
  collectEvents,
  easeProgress,
  nextToShow,
  stageLabel,
  visiblePopups,
  type ShownEvent,
} from '@/lib/loading-script';
import type { Dims } from '@/lib/preparing-steps';
import type { Purpose, StepProgress } from '@/types/pipeline';

const TICK_MS = 250;

export interface LoadingScript {
  /** 0 to 1, paced; read it every frame (a ref, so reading does not re-render). */
  progress: { current: number };
  /** The popups on the view now: newest first, at most two. */
  popups: ShownEvent[];
  /** Every popup shown so far, oldest first (the History). */
  history: ShownEvent[];
  /** The learning card on the side, null until the first one is due. */
  learning: PreparingCard | null;
  /** Every learning card shown so far, oldest first (also in History). */
  learned: PreparingCard[];
  stage: string;
  /** The bar has reached the end and every popup was shown: the story may take over. */
  finished: boolean;
}

/**
 * Plays the real progress at a readable pace (P-200). `ready` is true only when the analysis is
 * really done; until then the bar never reaches the end, and after it the show catches up quickly
 * (it never holds the student for more than MAX_LAG_AFTER_READY_MS).
 */
export function useLoadingScript({
  steps,
  dims,
  purpose,
  ready,
  paused = false,
}: {
  steps: StepProgress[];
  dims: Dims | null;
  purpose: Purpose | null;
  ready: boolean;
  /** Holds everything (a card is open, or the view is hidden): nothing advances. */
  paused?: boolean;
}): LoadingScript {
  const events = useMemo(() => collectEvents(steps, dims), [steps, dims]);
  const [facts] = useState(() => orderFacts(loadSeenFacts()));
  const pool = useMemo(() => {
    const full = buildPool(steps, dims, purpose, facts);
    // What the checks found and the plain checks go in the popups; the card on the side is for learning.
    return { ...full, findings: [], plain: [] };
  }, [steps, dims, purpose, facts]);

  const [shown, setShown] = useState<ShownEvent[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [learned, setLearned] = useState<{ card: PreparingCard; at: number }[]>([]);
  const [stage, setStage] = useState(() => stageLabel(0));
  const [finished, setFinished] = useState(false);
  const progress = useRef(0);

  const live = useRef({ events, pool, ready, paused, shown, learned });
  useEffect(() => {
    live.current = { events, pool, ready, paused, shown, learned };
  });
  const readySince = useRef<number | null>(null);
  const targetOf = useRef(0);

  useEffect(() => {
    if (!ready) readySince.current = null;
    else readySince.current ??= Date.now();
  }, [ready]);
  useEffect(() => {
    // The honest progress: how far the real steps have got; 1 only when the analysis is done.
    const done = new Set(
      steps.filter((s) => s.state === 'done' || s.state === 'skipped').map((s) => s.step),
    ).size;
    targetOf.current = ready ? 1 : Math.min(0.95, done / (done + 10));
  }, [steps, ready]);

  // The easing runs every frame; the popups and cards are checked a few times a second.
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const frame = (t: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(100, t - last);
      last = t;
      const l = live.current;
      if (l.paused) return;
      const all = l.events.length;
      const ceiling =
        all === 0 ? (l.ready ? 1 : 0.12) : Math.min(1, (l.shown.length + 1) / (all + 1));
      progress.current = easeProgress(
        progress.current,
        targetOf.current,
        l.ready && l.shown.length >= all ? 1 : ceiling,
        dt,
      );
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const l = live.current;
      if (l.paused) return;
      const t = Date.now();
      setNow(t);
      setStage(stageLabel(progress.current));
      const lagged = readySince.current !== null && t - readySince.current > MAX_LAG_AFTER_READY_MS;
      const next = nextToShow(l.events, l.shown, t, lagged);
      if (next) setShown((current) => [...current, { event: next, at: t }]);
      const lastLearn = l.learned[l.learned.length - 1];
      if (!lastLearn || t - lastLearn.at >= LEARN_GAP_MS) {
        const card = pickNext(
          l.pool,
          l.learned.map((x) => x.card.id),
        );
        setLearned((current) => [...current, { card, at: t }]);
        if (card.tier === 3) rememberFact(card.id);
      }
      const drained = l.shown.length >= l.events.length;
      if (l.ready && drained && progress.current >= 0.995) setFinished(true);
    }, TICK_MS);
    return () => clearInterval(timer);
  }, []);

  const popups = useMemo(() => visiblePopups(shown, now), [shown, now]);
  const last = learned[learned.length - 1];
  return {
    progress,
    popups,
    history: shown,
    learning: last?.card ?? null,
    learned: learned.map((x) => x.card),
    stage,
    finished,
  };
}
