'use client';

import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { Box, Loader2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { buildReveal, type PieceMode } from '@/lib/part-geometry';
import {
  SEVERITY_COLOR,
  artifactKey,
  hasSeparatePieces,
  isWebGLAvailable,
  shouldAskBeforeLoading,
  withoutHolds,
  type PartHighlight,
} from '@/lib/part-viewer';
import { cn } from '@/lib/utils';
import type { LessonCard } from '@/types/pipeline';
import { PartFocusProvider, useHasPartFocus, usePartFocus } from './PartFocus';
import type { ViewerStatus } from './PartViewer/PartViewerCanvas';

// three.js (and the viewer around it) is its own chunk: it is fetched only when a part with a
// model is about to be on screen, and never on pages without one.
const PartViewerCanvas = lazy(() => import('./PartViewer/PartViewerCanvas'));

export interface PartViewerSlotProps {
  /** The pipeline's preview image of the part (the `preview_png` artifact's short-lived link). */
  previewUrl?: string;
  /** The `model_glb` artifact's link: the part as it prints (oriented, bed at z = 0, millimetres). */
  modelUrl?: string;
  /** The `highlights_json` artifact's link: regions to draw on the model, by lesson-card `code`. */
  highlightsUrl?: string;
  /** The plan's lesson cards: regions on the part come from here too when there is no highlights file. */
  highlights?: LessonCard[];
  /** Whose screen this is: students read "your part", staff read about "the part". */
  audience?: 'student' | 'staff';
  /**
   * Turns on the "Print it yourself" layer slider under the viewer, and plays the short build-up
   * the first time this plan is seen (once per plan id, never with reduced motion).
   */
  planId?: string;
  /** Puts things on and beside the viewer (a "needs you" strip, chips, a lesson panel). */
  compose?: (context: ViewerContext) => ViewerComposition;
}

/** What the viewer knows once the 3D view has drawn. */
export interface ViewerContext {
  ready: boolean;
  /** The regions drawn, in marker order (marker 1 is the first). */
  drawn: PartHighlight[];
  /** Lowest and highest point of each drawn region, mm above the bed. */
  heights: Record<string, [number, number]>;
}

export interface ViewerComposition {
  /** On the viewer, above the picture. */
  strip?: ReactNode;
  /** Under the viewer, with the marker chips. */
  below?: ReactNode;
  /** Beside the viewer on desktop, directly under it on a phone. */
  panel?: ReactNode;
}

const REVEAL_KEY = '3dw.part-reveal.';
const revealed = new Set<string>();

function revealSeen(planId: string): boolean {
  if (revealed.has(planId)) return true;
  try {
    return window.localStorage.getItem(REVEAL_KEY + planId) !== null;
  } catch {
    return false;
  }
}

function markRevealSeen(planId: string) {
  revealed.add(planId);
  try {
    window.localStorage.setItem(REVEAL_KEY + planId, '1');
  } catch {
    // Private mode or a full disk: the in-memory set still covers this visit.
  }
}

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
}

type ViewerState = 'idle' | 'ready' | 'failed';

const subscribeNever = () => () => {};

/**
 * The part on its print plate, with the problem regions highlighted (SCOPE §2.5, P-29). The
 * preview image is on screen at once; the 3D view loads behind it and takes over when the model
 * is in. Without WebGL, or if the model won't load, the preview image simply stays.
 */
export function PartViewerSlot(props: PartViewerSlotProps) {
  const hasFocus = useHasPartFocus();
  // On screens with lesson cards a provider above links the two; otherwise the viewer is alone.
  return hasFocus ? (
    <PartViewer {...props} />
  ) : (
    <PartFocusProvider>
      <PartViewer {...props} />
    </PartFocusProvider>
  );
}

function PartViewer({
  previewUrl,
  modelUrl,
  highlightsUrl,
  highlights = [],
  audience = 'student',
  planId,
  compose,
}: PartViewerSlotProps) {
  const figureRef = useRef<HTMLElement>(null);
  const sliderId = useId();
  const [approved, setApproved] = useState(false);
  const [nearKey, setNearKey] = useState<string>();
  const [result, setResult] = useState<{
    key?: string;
    /** The exact (short-lived) link the result was for: a failure belongs to that link. */
    url?: string;
    state: ViewerState;
    drawn: PartHighlight[];
    heights: Record<string, [number, number]>;
    modelHeightMm: number;
    pieces: PieceMode;
  }>({ state: 'idle', drawn: [], heights: {}, modelHeightMm: 0, pieces: 'none' });
  const focus = usePartFocus();

  // Browser facts: false on the server and on first render, so hydration always matches.
  const supported = useSyncExternalStore(subscribeNever, isWebGLAvailable, () => false);
  const askFirst = useSyncExternalStore(subscribeNever, shouldAskBeforeLoading, () => false);

  const modelKey = artifactKey(modelUrl);
  const staff = audience === 'staff';
  // Students are not told about areas flagged by a staff hold (P-43).
  const flagged = (staff ? highlights : withoutHolds(highlights)).filter(
    (card) => card.region,
  ).length;
  // What the viewer reported belongs to the model it loaded; a new model starts over. A failure
  // belongs to the link it failed with: the same model under a fresh link (a later snapshot hands
  // out new ones, and an expired link is the usual reason a load fails) gets another try.
  const sameModel = result.key === modelKey;
  const staleFailure = result.state === 'failed' && result.url !== modelUrl;
  const current =
    sameModel && !staleFailure
      ? result
      : {
          state: 'idle' as ViewerState,
          drawn: [],
          heights: {},
          modelHeightMm: 0,
          pieces: 'none' as const,
        };
  const state = current.state;
  const drawn = current.drawn;
  const { heights, modelHeightMm, pieces } = current;
  const separatePieces = hasSeparatePieces(staff ? highlights : withoutHolds(highlights));

  // The layer slider: how much of the part is built, 0 to 1 of its height. A part about to play
  // its first-view build-up starts empty.
  const [revealPlanned] = useState(
    () => Boolean(planId) && !prefersReducedMotion() && !revealSeen(planId!),
  );
  const [fraction, setFraction] = useState(revealPlanned ? 0 : 1);
  const revealFrame = useRef(0);
  const revealStarted = useRef(false);
  const cutMm = fraction >= 1 ? null : Math.max(fraction * (modelHeightMm || 1), 0.01);

  const stopReveal = useCallback(() => {
    if (!revealFrame.current) return;
    cancelAnimationFrame(revealFrame.current);
    revealFrame.current = 0;
    setFraction(1);
  }, []);

  const playReveal = useCallback(
    (regionHeights: Record<string, [number, number]>, height: number) => {
      const stops = Object.values(regionHeights).map(([low]) => low / height);
      const timeline = buildReveal(stops);
      const startedAt = performance.now();
      const tick = (now: number) => {
        const elapsed = now - startedAt;
        if (elapsed >= timeline.duration) {
          revealFrame.current = 0;
          setFraction(1);
          return;
        }
        setFraction(timeline.at(elapsed));
        revealFrame.current = requestAnimationFrame(tick);
      };
      setFraction(0);
      revealFrame.current = requestAnimationFrame(tick);
    },
    [],
  );

  const sliderShown = Boolean(planId) && state === 'ready' && modelHeightMm > 0;

  useEffect(() => {
    if (!planId || state !== 'ready' || modelHeightMm <= 0 || !revealPlanned) return;
    if (revealStarted.current) return;
    revealStarted.current = true;
    markRevealSeen(planId);
    playReveal(heights, modelHeightMm);
  }, [planId, state, modelHeightMm, revealPlanned, heights, playReveal]);

  useEffect(() => () => cancelAnimationFrame(revealFrame.current), []);

  // Any tap, key or scroll on the viewer or beside it ends the build-up with the whole part shown.
  const skipReveal = () => stopReveal();

  // Choosing a region brings the slider up to it, so it is on the part when the camera arrives.
  const regionTop = focus.code ? heights[focus.code]?.[1] : undefined;
  const { nonce: focusNonce } = focus;
  useEffect(() => {
    if (!focusNonce || regionTop === undefined || modelHeightMm <= 0 || revealFrame.current) return;
    setFraction((previous) => Math.max(previous, Math.min(1, (regionTop + 0.05) / modelHeightMm)));
  }, [focusNonce, regionTop, modelHeightMm]);

  // Start loading only once the viewer is (nearly) on screen.
  useEffect(() => {
    const node = figureRef.current;
    if (!node || !modelKey || !supported || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setNearKey(modelKey);
          observer.disconnect();
        }
      },
      { rootMargin: '300px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [modelKey, supported]);

  const near = typeof IntersectionObserver === 'undefined' || nearKey === modelKey;
  const mount =
    Boolean(modelKey) && supported && near && state !== 'failed' && (!askFirst || approved);
  const loading = mount && state !== 'ready';

  function handleStatus(status: ViewerStatus) {
    setResult(
      status.state === 'ready'
        ? {
            key: modelKey,
            url: modelUrl,
            state: 'ready',
            drawn: status.highlights,
            heights: status.heights ?? {},
            modelHeightMm: status.modelHeightMm ?? 0,
            pieces: status.pieces ?? 'none',
          }
        : {
            key: modelKey,
            url: modelUrl,
            state: 'failed',
            drawn: [],
            heights: {},
            modelHeightMm: 0,
            pieces: 'none',
          },
    );
  }

  const ready = state === 'ready';
  const flaggedLabel = staff
    ? flagged === 1
      ? '1 area of the part is flagged.'
      : `${flagged} areas of the part are flagged.`
    : flagged === 1
      ? '1 area of your part is flagged below.'
      : `${flagged} areas of your part are flagged below.`;
  const composed = compose?.({ ready, drawn, heights }) ?? {};
  const shownHeight = cutMm ?? modelHeightMm;
  // A region is "lit" once the slider has reached its lowest point.
  const lit = (code: string) => {
    const low = heights[code]?.[0];
    return cutMm === null || low === undefined || cutMm >= low - 0.001;
  };

  const figure = (
    <figure
      ref={figureRef}
      data-slot="part-viewer"
      data-highlights={flagged}
      data-viewer={ready ? 'ready' : state === 'failed' ? 'failed' : mount ? 'loading' : 'preview'}
      data-pieces={ready && pieces !== 'none' ? pieces : undefined}
      className="min-w-0 overflow-hidden rounded-lg border bg-muted/30"
    >
      {composed.strip}
      <div className="relative aspect-[4/3]">
        {/* The preview is there from the first paint and stays until the 3D view has drawn. */}
        <div
          className={cn('absolute inset-0 flex items-center justify-center', ready && 'invisible')}
        >
          {previewUrl ? (
            // A short-lived signed link from another origin, so next/image's optimiser doesn't apply.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt={
                staff
                  ? "Preview of the student's part on the print plate"
                  : 'Preview of your part on the print plate'
              }
              className="size-full object-contain"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 px-6 text-center text-sm text-muted-foreground">
              <Box className="size-8" aria-hidden="true" />
              <span>The preview image will show up here.</span>
            </div>
          )}
        </div>

        {mount && modelUrl && (
          <Suspense fallback={null}>
            <PartViewerCanvas
              modelUrl={modelUrl}
              highlightsUrl={highlightsUrl}
              cards={highlights}
              audience={audience}
              separatePieces={separatePieces}
              cutMm={cutMm}
              onStatus={handleStatus}
            />
          </Suspense>
        )}

        {loading && (
          <span
            role="status"
            className="absolute bottom-2 left-2 inline-flex items-center gap-1.5 rounded-full bg-background/80 px-2.5 py-1 text-xs text-muted-foreground backdrop-blur"
          >
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            Loading the 3D view
          </span>
        )}

        {Boolean(modelKey) && supported && askFirst && !approved && (
          <div className="absolute bottom-2 left-2">
            <Button type="button" size="sm" variant="secondary" onClick={() => setApproved(true)}>
              <Box aria-hidden="true" />
              Load the 3D view
            </Button>
          </div>
        )}
      </div>

      {sliderShown && (
        <div className="border-t px-3 py-2" data-slot="layer-slider">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor={`${sliderId}-range`} className="text-sm font-medium">
              Print it yourself
            </label>
            <span className="text-xs text-muted-foreground tabular-nums">
              {shownHeight.toFixed(1)} of {modelHeightMm.toFixed(1)} mm up
            </span>
            <button
              type="button"
              onClick={() => {
                stopReveal();
                playReveal(heights, modelHeightMm);
              }}
              className="inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-xs font-medium text-primary hover:underline"
            >
              <Play className="size-3.5" aria-hidden="true" />
              Watch it build
            </button>
          </div>
          <div className="relative mt-1">
            <input
              id={`${sliderId}-range`}
              type="range"
              min={0}
              max={1000}
              step={1}
              value={Math.round(fraction * 1000)}
              onChange={(event) => {
                stopReveal();
                setFraction(Number(event.target.value) / 1000);
              }}
              aria-valuetext={`${shownHeight.toFixed(1)} millimetres of ${modelHeightMm.toFixed(1)}`}
              className="h-8 w-full cursor-pointer accent-purple-light"
            />
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-2">
              {drawn
                .filter((highlight) => heights[highlight.code])
                .map((highlight) => {
                  const at = Math.min(1, heights[highlight.code][0] / modelHeightMm);
                  return (
                    <span
                      key={highlight.code}
                      data-tick={highlight.code}
                      data-lit={lit(highlight.code) || undefined}
                      className={cn(
                        'absolute bottom-0 h-2 w-1 -translate-x-1/2 rounded-sm',
                        !lit(highlight.code) && 'opacity-50',
                      )}
                      style={{
                        left: `calc(${at * 100}% + ${(0.5 - at) * 16}px)`,
                        background: SEVERITY_COLOR[highlight.severity],
                      }}
                    />
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {ready && drawn.length > 0 ? (
        <figcaption className="border-t px-3 py-2">
          <p className="text-xs text-muted-foreground">
            Drag to turn the part, pinch to zoom. Tap a marker to see what it is.
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {drawn.map((highlight, index) => (
              <li key={highlight.code}>
                <button
                  type="button"
                  aria-pressed={focus.code === highlight.code}
                  onClick={() => focus.focus(highlight.code, composed.panel ? 'panel' : 'viewer')}
                  className={cn(
                    'inline-flex min-h-9 max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-left text-xs',
                    focus.code === highlight.code && 'border-ring bg-accent',
                    !lit(highlight.code) && 'opacity-60',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="flex size-4 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                    style={{ background: SEVERITY_COLOR[highlight.severity] }}
                  >
                    {index + 1}
                  </span>
                  <span className="truncate">{highlight.label}</span>
                </button>
              </li>
            ))}
          </ul>
          {composed.below}
        </figcaption>
      ) : composed.below ? (
        <figcaption className="border-t px-3 py-2">{composed.below}</figcaption>
      ) : (
        flagged > 0 && (
          <figcaption className="border-t px-3 py-2 text-xs text-muted-foreground">
            {flaggedLabel}
          </figcaption>
        )
      )}
    </figure>
  );

  if (!compose && !planId) return figure;
  return (
    <div
      className={cn(
        compose && 'grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start',
      )}
      onPointerDownCapture={skipReveal}
      onKeyDownCapture={skipReveal}
      onWheelCapture={skipReveal}
      onTouchStartCapture={skipReveal}
    >
      {figure}
      {composed.panel}
    </div>
  );
}
