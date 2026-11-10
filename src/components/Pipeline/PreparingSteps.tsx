'use client';

import { Suspense, lazy, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { cn } from '@/lib/utils';
import { isWebGLAvailable } from '@/lib/part-viewer';
import { progressOf, statusLinesFor, type Dims } from '@/lib/preparing-steps';
import {
  buildPool,
  loadSeenFacts,
  orderFacts,
  pickNext,
  rememberFact,
  type PreparingCard,
} from '@/lib/preparing-cards';
import type { Purpose, StepProgress } from '@/types/pipeline';

// three.js is its own chunk, fetched only when this screen can actually draw the part.
const PreparingPartCanvas = lazy(() => import('./PartViewer/PreparingPartCanvas'));

const subscribeNever = () => () => {};
const subscribeMotion = (notify: () => void) => {
  const query = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  query?.addEventListener?.('change', notify);
  return () => query?.removeEventListener?.('change', notify);
};
const reducedMotionNow = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

const STATUS_MS = 3200;
const CAROUSEL_MS = 6500;

/** Index that advances every `ms` over `length` items. */
function useRotating(length: number, ms: number) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (length < 2) return;
    const timer = setInterval(() => setTick((n) => n + 1), ms);
    return () => clearInterval(timer);
  }, [length, ms]);
  return length === 0 ? 0 : tick % length;
}

/**
 * One card at a time, ranked (see preparing-cards.ts), never repeating. The pool is read fresh at
 * every tick, so a finding that turns up mid-way is the next card.
 */
function useCards(pool: ReturnType<typeof buildPool>, ms: number): PreparingCard {
  const poolRef = useRef(pool);
  useEffect(() => {
    poolRef.current = pool;
  }, [pool]);
  const [state, setState] = useState(() => {
    const card = pickNext(pool, []);
    return { card, seen: [card.id] };
  });
  useEffect(() => {
    const timer = setInterval(() => {
      setState((s) => {
        const card = pickNext(poolRef.current, s.seen);
        return { card, seen: [...s.seen, card.id] };
      });
    }, ms);
    return () => clearInterval(timer);
  }, [ms]);
  const { id, tier } = state.card;
  useEffect(() => {
    if (tier === 3) rememberFact(id);
  }, [id, tier]);
  return state.card;
}

/**
 * "Preparing your print": the student's part in 3D, greyed out and slowly turning under a loading
 * shimmer, a few short status lines that suit the part, and a calm carousel, one card at a time:
 * what the checks found on this very part, lessons that fit its shape and purpose, general facts
 * about printing, and the five plain checks at the start and as filler (P-61). Nothing else the
 * pipeline does is listed here. Without WebGL the same animation plays
 * over a plain shape; with reduced motion nothing moves except the words.
 */
export function PreparingSteps({
  steps,
  file = null,
  modelUrl,
  purpose = null,
  className,
}: {
  steps: StepProgress[];
  /** The student's own file, when it is still in memory (the new-print screen). */
  file?: File | null;
  /** The snapshot's model_glb, when it already carries one. */
  modelUrl?: string;
  /** What the student said the print is for, when known (new-print screen). */
  purpose?: Purpose | null;
  className?: string;
}) {
  const webgl = useSyncExternalStore(subscribeNever, isWebGLAvailable, () => false);
  const reduced = useSyncExternalStore(subscribeMotion, reducedMotionNow, () => false);
  const [failed, setFailed] = useState(false);
  const [measured, setMeasured] = useState<{ key: object | string; dims: Dims } | null>(null);
  const partKey: object | string = file ?? modelUrl ?? 'placeholder';
  const dims = measured && measured.key === partKey ? measured.dims : null;
  const canDraw = webgl && !failed;

  const lines = statusLinesFor(dims);
  const lineIndex = useRotating(lines.length, STATUS_MS);
  // The order of general facts is chosen once per visit, away from what this browser saw lately.
  const [facts] = useState(() => orderFacts(loadSeenFacts()));
  const pool = useMemo(() => buildPool(steps, dims, purpose, facts), [steps, dims, purpose, facts]);
  const card = useCards(pool, CAROUSEL_MS);
  const progress = progressOf(steps);

  return (
    <div className={cn('space-y-4', className)} aria-label="Preparing your print">
      <div
        data-testid="preparing-stage"
        data-viewer={canDraw ? 'webgl' : 'plain'}
        className="relative mx-auto aspect-[16/10] w-full max-w-xl overflow-hidden rounded-lg border border-control-border bg-muted/40"
      >
        {canDraw ? (
          <Suspense fallback={null}>
            <PreparingPartCanvas
              file={file}
              modelUrl={modelUrl}
              reducedMotion={reduced}
              onDims={(next) => setMeasured(next ? { key: partKey, dims: next } : null)}
              onUnavailable={() => setFailed(true)}
            />
          </Suspense>
        ) : (
          <PlainShape reduced={reduced} />
        )}
        {/* the loading animation over the part */}
        <div
          aria-hidden="true"
          data-testid="preparing-shimmer"
          className={cn(
            'pointer-events-none absolute inset-0',
            !reduced && 'animate-[preparing-sweep_2.6s_ease-in-out_infinite]',
          )}
          style={{
            background:
              'linear-gradient(105deg, transparent 35%, color-mix(in oklab, var(--color-primary, #6366f1) 22%, transparent) 50%, transparent 65%)',
            backgroundSize: '250% 100%',
            backgroundPosition: reduced ? '50% 0' : undefined,
          }}
        />
        <style>{`@keyframes preparing-sweep{from{background-position:130% 0}to{background-position:-30% 0}}@keyframes preparing-fade{from{opacity:0}to{opacity:1}}`}</style>
      </div>

      <div
        role="status"
        aria-live="polite"
        className="space-y-2 text-center"
        data-testid="preparing-status"
      >
        <p className="text-base font-medium" key={lineIndex}>
          {lines[lineIndex]}
        </p>
        <div
          aria-hidden="true"
          className="mx-auto h-1 w-full max-w-xs overflow-hidden rounded-full bg-muted"
        >
          <div
            data-testid="preparing-progress"
            className={cn(
              'h-full rounded-full bg-primary',
              !reduced && 'transition-[width] duration-700',
            )}
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      </div>

      <div
        data-testid="preparing-check"
        data-tier={card.tier}
        key={card.id}
        className={cn(
          'mx-auto min-h-24 max-w-md text-center',
          !reduced && 'animate-[preparing-fade_0.6s_ease-out]',
        )}
      >
        {card.kicker && (
          <p className="text-xs font-medium tracking-wide text-primary uppercase">{card.kicker}</p>
        )}
        <p className="mt-0.5 text-sm font-medium">{card.title}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{card.body}</p>
      </div>
    </div>
  );
}

/** What stands in for the part with no WebGL (and while the 3D chunk loads): a soft turning block. */
function PlainShape({ reduced }: { reduced: boolean }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
      <div
        className={cn(
          'size-24 rounded-2xl bg-muted-foreground/25 shadow-inner',
          !reduced && 'animate-pulse',
        )}
      />
    </div>
  );
}
