'use client';

import { Suspense, lazy, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Box, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  SEVERITY_COLOR,
  artifactKey,
  isWebGLAvailable,
  shouldAskBeforeLoading,
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
}: PartViewerSlotProps) {
  const figureRef = useRef<HTMLElement>(null);
  const [approved, setApproved] = useState(false);
  const [nearKey, setNearKey] = useState<string>();
  const [result, setResult] = useState<{
    key?: string;
    state: ViewerState;
    drawn: PartHighlight[];
  }>({ state: 'idle', drawn: [] });
  const focus = usePartFocus();

  // Browser facts: false on the server and on first render, so hydration always matches.
  const supported = useSyncExternalStore(subscribeNever, isWebGLAvailable, () => false);
  const askFirst = useSyncExternalStore(subscribeNever, shouldAskBeforeLoading, () => false);

  const modelKey = artifactKey(modelUrl);
  const flagged = highlights.filter((card) => card.region).length;
  // What the viewer reported belongs to the model it loaded; a new model starts over.
  const current = result.key === modelKey ? result : { state: 'idle' as ViewerState, drawn: [] };
  const state = current.state;
  const drawn = current.drawn;

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
        ? { key: modelKey, state: 'ready', drawn: status.highlights }
        : { key: modelKey, state: 'failed', drawn: [] },
    );
  }

  const ready = state === 'ready';
  const staff = audience === 'staff';
  const flaggedLabel = staff
    ? flagged === 1
      ? '1 area of the part is flagged.'
      : `${flagged} areas of the part are flagged.`
    : flagged === 1
      ? '1 area of your part is flagged below.'
      : `${flagged} areas of your part are flagged below.`;

  return (
    <figure
      ref={figureRef}
      data-slot="part-viewer"
      data-highlights={flagged}
      data-viewer={ready ? 'ready' : state === 'failed' ? 'failed' : mount ? 'loading' : 'preview'}
      className="overflow-hidden rounded-lg border bg-muted/30"
    >
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
                  onClick={() => focus.focus(highlight.code, 'viewer')}
                  className={cn(
                    'inline-flex min-h-9 max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-left text-xs',
                    focus.code === highlight.code && 'border-ring bg-accent',
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
        </figcaption>
      ) : (
        flagged > 0 && (
          <figcaption className="border-t px-3 py-2 text-xs text-muted-foreground">
            {flaggedLabel}
          </figcaption>
        )
      )}
    </figure>
  );
}
