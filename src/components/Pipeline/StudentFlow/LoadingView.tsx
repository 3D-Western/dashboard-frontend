'use client';

import { Suspense, lazy, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { isWebGLAvailable } from '@/lib/part-viewer';
import type { Dims } from '@/lib/preparing-steps';
import { POPUP_STAY_MS } from '@/lib/loading-script';
import type { HandledNote } from '@/lib/story-cards';
import type { Purpose, StepProgress } from '@/types/pipeline';
import { TakingLongerNotice } from '../TakingLongerNotice';
import { useLoadingScript } from './useLoadingScript';

// three.js is its own chunk, fetched only when this view can really draw the part.
const PreparingPartCanvas = lazy(() => import('../PartViewer/PreparingPartCanvas'));

const subscribeNever = () => () => {};
const subscribeMotion = (notify: () => void) => {
  const query = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  query?.addEventListener?.('change', notify);
  return () => query?.removeEventListener?.('change', notify);
};
const reducedMotionNow = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/**
 * The loading view (P-200): the student's part appears, an X-ray scan fills it in from the plate up,
 * at most two popups say what was checked and what was found (newest on top, each for about 7.5 s,
 * never closer than 3 s, 5.5 s after something found), and a learning card sits beside it (on a
 * phone, a one-line "Did you know"). It ends only when `ready` (the analysis is really done) and
 * everything real has been shown, then calls `onFinished` so the story can take over in place.
 */
export function LoadingView({
  steps,
  file,
  modelUrl,
  purpose,
  ready,
  handled,
  takingLonger,
  onFinished,
}: {
  steps: StepProgress[];
  file: File | null;
  modelUrl?: string;
  purpose: Purpose | null;
  /** The analysis is really done (the plan is in). */
  ready: boolean;
  /** Found and fixed (P-202): shown as notes once the plan is in, before the story takes over. */
  handled?: readonly HandledNote[];
  takingLonger?: boolean;
  onFinished: () => void;
}) {
  const webgl = useSyncExternalStore(subscribeNever, isWebGLAvailable, () => false);
  const reduced = useSyncExternalStore(subscribeMotion, reducedMotionNow, () => false);
  const [failed, setFailed] = useState(false);
  const [dims, setDims] = useState<Dims | null>(null);
  const canDraw = webgl && !failed;
  const [showLog, setShowLog] = useState(false);
  const [didYouOpen, setDidYouOpen] = useState(false);

  const script = useLoadingScript({ steps, dims, purpose, ready, handled });
  const { progress, popups, history, learning, learned, stage, finished } = script;

  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (finished) onFinished();
    // onFinished is the parent's latch; calling it once is enough
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  // The bar and the scan line follow the paced progress every frame without re-rendering.
  useEffect(() => {
    let raf = 0;
    const frame = () => {
      raf = requestAnimationFrame(frame);
      const root = rootRef.current;
      if (!root) return;
      const q = Math.round(progress.current * 1000) / 1000;
      root.style.setProperty('--sf-q', String(q));
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [progress]);

  const spanRef = useRef('');
  const onSpan = (bottom: number, top: number) => {
    const key = `${bottom.toFixed(3)}:${top.toFixed(3)}`;
    if (key === spanRef.current) return;
    spanRef.current = key;
    rootRef.current?.style.setProperty('--sf-y1', bottom.toFixed(4));
    rootRef.current?.style.setProperty('--sf-y0', top.toFixed(4));
  };

  // Newest first: popups by their time; learning cards trail (they carry no clock of their own).
  const log = [
    ...history
      .slice()
      .reverse()
      .map((s) => ({ key: s.event.id, text: s.event.label + ': ' + s.event.text })),
    ...learned
      .slice()
      .reverse()
      .map((card) => ({ key: card.id, text: 'Did you know: ' + card.title })),
  ];

  return (
    <div
      ref={rootRef}
      className="sf-grid"
      data-view="loading"
      data-testid="loading-view"
      data-showlog={showLog || undefined}
      data-dyopen={didYouOpen || undefined}
      style={{ ['--sf-y0' as string]: '0.1', ['--sf-y1' as string]: '0.9' }}
    >
      <div className="sf-vpcol sf-enter">
        <div
          className="sf-vp"
          data-testid="loading-stage"
          data-viewer={canDraw ? 'webgl' : 'plain'}
        >
          {canDraw ? (
            <Suspense fallback={null}>
              <PreparingPartCanvas
                file={file}
                modelUrl={file ? undefined : modelUrl}
                reducedMotion={reduced}
                onDims={setDims}
                onUnavailable={() => setFailed(true)}
                scan={{ progress, onSpan }}
              />
            </Suspense>
          ) : (
            <div className="sf-plain" aria-hidden="true" />
          )}
          <div className="sf-scan" aria-hidden="true" />
          <ul
            className="sf-fd sf-feedov"
            aria-label="What we are checking"
            data-testid="loading-popups"
          >
            {popups.map(({ event }) => (
              <li
                key={event.id}
                data-kind={event.kind}
                className={
                  event.kind === 'step' ? undefined : event.kind === 'fixed' ? 'f ok' : 'f'
                }
                style={{ ['--sf-stay' as string]: `${POPUP_STAY_MS}ms` }}
              >
                {event.kind === 'finding' ? (
                  <i className="sf-pn">{event.n}</i>
                ) : event.kind === 'fixed' ? (
                  <i className="sf-pn sf-pn-ok" aria-hidden="true">
                    &#10003;
                  </i>
                ) : (
                  <i className="sf-d" />
                )}
                <span>
                  <b>{event.label}</b>
                  {event.text}
                </span>
              </li>
            ))}
          </ul>
          {takingLonger && (
            <div className="sf-late">
              <TakingLongerNotice />
            </div>
          )}
        </div>
      </div>

      <div className="sf-side">
        <div className="sf-vs-top">
          <span className="sf-kick sf-kick-muted">Checking your part</span>
          <b data-testid="loading-status" role="status" aria-live="polite">
            {stage}
          </b>
        </div>
        <div className="sf-prog" aria-hidden="true">
          <i />
        </div>
        {!showLog && learning && (
          <div
            className="sf-lcard2"
            key={learning.id}
            data-testid="loading-card"
            data-tier={learning.tier}
          >
            <span className="sf-kick sf-kick-warm">{learning.kicker ?? 'Good to know'}</span>
            <h4>{learning.title}</h4>
            <p>{learning.body}</p>
            <button type="button" className="sf-dyc" onClick={() => setDidYouOpen(false)}>
              Close
            </button>
          </div>
        )}
        {!showLog && learning && (
          <button type="button" className="sf-didyou" onClick={() => setDidYouOpen(true)}>
            <span className="sf-dy-k">Did you know</span>
            <span className="sf-dy-t">{learning.title}</span>
            <span className="sf-dy-c" aria-hidden="true">
              &#9662;
            </span>
          </button>
        )}
        {showLog && <HistoryLog items={log} />}
        <div className="sf-vs-foot">
          <button
            type="button"
            className="sf-hbtn2"
            aria-pressed={showLog}
            onClick={() => setShowLog((v) => !v)}
          >
            {showLog ? 'Back to the card' : `History (${log.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}

/** The popups and cards so far, a page at a time (no scrolling): as many lines as fit. */
function HistoryLog({ items }: { items: { key: string; text: string }[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [perPage, setPerPage] = useState(4);
  const [page, setPage] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const measure = () => {
      const space = el.clientHeight - 64;
      if (space > 0) setPerPage(Math.max(2, Math.floor(space / 34)));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const pages = Math.max(1, Math.ceil(items.length / perPage));
  const at = Math.min(page, pages - 1);
  return (
    <div ref={ref} className="sf-hlog" data-testid="loading-history">
      <div className="sf-hl-items">
        {items.slice(at * perPage, at * perPage + perPage).map((item) => (
          <div key={item.key}>{item.text}</div>
        ))}
        {items.length === 0 && <div>Nothing yet.</div>}
      </div>
      <div className="sf-hl-pg">
        <button
          type="button"
          aria-label="Newer"
          disabled={at === 0}
          onClick={() => setPage(at - 1)}
        >
          &#8249;
        </button>
        <span>
          {at + 1} / {pages}
        </span>
        <button
          type="button"
          aria-label="Older"
          disabled={at >= pages - 1}
          onClick={() => setPage(at + 1)}
        >
          &#8250;
        </button>
      </div>
    </div>
  );
}
