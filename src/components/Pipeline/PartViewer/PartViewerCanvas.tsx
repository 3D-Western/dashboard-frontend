'use client';

// The lazy half of the part viewer: owns the three.js scene. Loaded by PartViewerSlot only when
// the viewer is near the screen, so three.js never weighs on the pages that don't show a part.

import { useEffect, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import type { PieceMode } from '@/lib/part-geometry';
import {
  artifactKey,
  parseHighlights,
  viewerHighlights,
  type PartHighlight,
} from '@/lib/part-viewer';
import type { LessonCard } from '@/types/pipeline';
import { usePartFocus } from '../PartFocus';
import { PartScene } from './partScene';

export type ViewerStatus =
  | {
      state: 'ready';
      highlights: PartHighlight[];
      /** Lowest and highest point of each drawn region, mm above the bed. */
      heights?: Record<string, [number, number]>;
      /** Height of the part, mm. */
      modelHeightMm?: number;
      /** How separate pieces were coloured (`none` when the plan has no such finding). */
      pieces?: PieceMode;
    }
  | { state: 'error'; reason: string };

export interface PartViewerCanvasProps {
  modelUrl: string;
  highlightsUrl?: string;
  cards?: LessonCard[];
  /** Students never get `hold` highlights (a staff hold looks like "preparing" to them). */
  audience?: 'student' | 'staff';
  /** The plan has the several-pieces finding: colour each piece instead of boxing them. */
  separatePieces?: boolean;
  /** Cut the part at this height above the bed (the layer slider); null shows all of it. */
  cutMm?: number | null;
  onStatus: (status: ViewerStatus) => void;
}

async function fetchHighlights(url: string | undefined, signal: AbortSignal) {
  if (!url) return [];
  try {
    const response = await fetch(url, { signal });
    if (!response.ok) return [];
    return parseHighlights(await response.json());
  } catch {
    // The model is the part that matters; regions then come from the lesson cards alone.
    return [];
  }
}

export default function PartViewerCanvas({
  modelUrl,
  highlightsUrl,
  cards,
  audience = 'student',
  separatePieces = false,
  cutMm = null,
  onStatus,
}: PartViewerCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const markerLayerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<PartScene | null>(null);
  const [ready, setReady] = useState(false);
  const focus = usePartFocus();

  // Latest values for the long-lived effect below, which must not restart when they change.
  const latest = useRef({
    modelUrl,
    highlightsUrl,
    cards,
    audience,
    separatePieces,
    cutMm,
    onStatus,
    focus,
  });
  useEffect(() => {
    latest.current = {
      modelUrl,
      highlightsUrl,
      cards,
      audience,
      separatePieces,
      cutMm,
      onStatus,
      focus,
    };
  });
  const { setLinked, focus: focusRequest } = focus;

  const modelKey = artifactKey(modelUrl);
  const highlightsKey = artifactKey(highlightsUrl);

  useEffect(() => {
    const container = containerRef.current;
    const markerLayer = markerLayerRef.current;
    if (!container || !markerLayer) return;

    let cancelled = false;
    const abort = new AbortController();
    let scene: PartScene;
    try {
      scene = new PartScene({
        container,
        markerLayer,
        reducedMotion: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
        onSelect: (code) => latest.current.focus.focus(code, 'viewer'),
        onContextLost: () => latest.current.onStatus({ state: 'error', reason: 'context lost' }),
      });
    } catch (error) {
      latest.current.onStatus({ state: 'error', reason: String(error) });
      return;
    }
    sceneRef.current = scene;
    scene.setCut(latest.current.cutMm);

    const observer =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(([entry]) => scene.setOnScreen(entry?.isIntersecting ?? true), {
            rootMargin: '50px',
          });
    observer?.observe(container);

    (async () => {
      try {
        const [loaded, fromFile] = await Promise.all([
          scene.loadModel(latest.current.modelUrl, { pieces: latest.current.separatePieces }),
          fetchHighlights(latest.current.highlightsUrl, abort.signal),
        ]);
        if (cancelled) return;
        const merged = viewerHighlights(fromFile, latest.current.cards, latest.current.audience);
        const drawn = new Set(scene.setHighlights(merged));
        const shown = merged.filter((h) => drawn.has(h.code));
        setLinked([...drawn]);
        setReady(true);
        latest.current.onStatus({
          state: 'ready',
          highlights: shown,
          heights: scene.regionHeights(),
          modelHeightMm: loaded.height,
          pieces: loaded.pieces,
        });
      } catch (error) {
        if (!cancelled) latest.current.onStatus({ state: 'error', reason: String(error) });
      }
    })();

    return () => {
      cancelled = true;
      abort.abort();
      observer?.disconnect();
      scene.dispose();
      sceneRef.current = null;
      setReady(false);
      setLinked([]);
    };
  }, [modelKey, highlightsKey, setLinked]);

  // The layer slider moved.
  useEffect(() => {
    sceneRef.current?.setCut(cutMm);
  }, [cutMm, ready]);

  // A card, a chip or a region was tapped: fly there and pulse it.
  const { code, nonce, source } = focus;
  useEffect(() => {
    if (!ready || nonce === 0) return;
    sceneRef.current?.focus(code);
    if (source === 'viewer') return;
    const box = containerRef.current?.getBoundingClientRect();
    if (!box) return;
    const visible = Math.min(box.bottom, window.innerHeight) - Math.max(box.top, 0);
    if (visible < box.height * 0.6) {
      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      containerRef.current?.scrollIntoView({
        behavior: reduced ? 'auto' : 'smooth',
        block: 'nearest',
      });
    }
  }, [ready, code, nonce, source]);

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="absolute inset-0 touch-pan-y" />
      <div ref={markerLayerRef} className="pointer-events-none absolute inset-0 overflow-hidden" />
      {ready && (
        <button
          type="button"
          onClick={() => {
            sceneRef.current?.resetView();
            if (code) focusRequest(null, 'viewer');
          }}
          className="absolute top-1 right-1 flex size-11 items-center justify-center rounded-full bg-background/80 text-foreground shadow backdrop-blur fine:size-9"
          aria-label="Reset view"
        >
          <RotateCcw className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
