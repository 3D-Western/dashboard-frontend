'use client';

import { Suspense, lazy, useEffect, useState, useSyncExternalStore } from 'react';
import { cn } from '@/lib/utils';
import { isWebGLAvailable } from '@/lib/part-viewer';
import { progressOf, shownSteps, statusLinesFor, type Dims } from '@/lib/preparing-steps';
import type { StepProgress } from '@/types/pipeline';

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
const CAROUSEL_MS = 5200;

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
 * "Preparing your print": the student's part in 3D, greyed out and slowly turning under a loading
 * shimmer, a few short status lines that suit the part, and a gentle carousel of the plain checks
 * (P-61). Nothing else the pipeline does is listed here. Without WebGL the same animation plays
 * over a plain shape; with reduced motion nothing moves except the words.
 */
export function PreparingSteps({
  steps,
  file = null,
  modelUrl,
  className,
}: {
  steps: StepProgress[];
  /** The student's own file, when it is still in memory (the new-print screen). */
  file?: File | null;
  /** The snapshot's model_glb, when it already carries one. */
  modelUrl?: string;
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
  const shown = shownSteps(steps);
  const cardIndex = useRotating(shown.length, CAROUSEL_MS);
  const card = shown[cardIndex];
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
        <style>{`@keyframes preparing-sweep{from{background-position:130% 0}to{background-position:-30% 0}}`}</style>
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

      {card && (
        <div data-testid="preparing-check" key={card.step} className="mx-auto max-w-md text-center">
          <p className="text-sm font-medium">{card.title}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{card.teaching}</p>
        </div>
      )}
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
