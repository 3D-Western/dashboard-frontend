'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Pause, Play, Video, X } from 'lucide-react';
import {
  LiveViewFrameError,
  isLiveViewEnded,
  liveViewRelayUrl,
  pipelineApi,
} from '@/api/client/pipeline';
import { ApiError, ErrorCodes } from '@/api/client/errors';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type { LiveViewOffer, LiveViewReason } from '@/types/pipeline';

/** A stream the backend does not say how long it runs ends by itself after this (seconds). */
const DEFAULT_STREAM_S = 90;
/** Pictures are never asked for more often than this (ms), whatever the backend suggests. */
const MIN_FRAME_MS = 1000;
/** On mobile data, or with "save data" on, pictures come this slowly (ms). */
const SLOW_FRAME_MS = 5000;
/** How long pictures keep refreshing before the viewer pauses itself (ms): the camera is shared. */
const FRAMES_MAX_MS = 180_000;
/** Pictures that fail this many times in a row end the viewing. */
const MAX_FRAME_FAILURES = 4;

const REASON_TEXT: Record<string, string> = {
  disabled: 'Watching prints is not switched on right now.',
  not_printing: 'This print is not on a printer right now.',
  no_camera: "This printer's camera is not available.",
};

/** Whether the connection looks metered or slow: the video does not start by itself there. */
export function onMobileData(): boolean {
  if (typeof navigator === 'undefined') return false;
  const connection = (
    navigator as Navigator & {
      connection?: { saveData?: boolean; type?: string; effectiveType?: string };
    }
  ).connection;
  if (!connection) return false;
  return (
    connection.saveData === true ||
    connection.type === 'cellular' ||
    connection.effectiveType === 'slow-2g' ||
    connection.effectiveType === '2g'
  );
}

/** What the viewer is doing: nothing yet, asking, playing the video, refreshing pictures, paused, or done. */
type Phase = 'closed' | 'opening' | 'video' | 'pictures' | 'paused' | 'ended' | 'unavailable';

interface WatchItPrintProps {
  jobId: string;
  /** Staff watch any print; the words change a little ("this print" instead of "your print"). */
  audience?: 'student' | 'staff';
  /** Test hooks: shorter waits. */
  frameDelayMs?: number;
  streamSeconds?: number;
}

/**
 * "Watch it print" (P-100): a button that opens a small viewer of the printer's camera while the
 * job is on a printer. The picture comes through the backend only. The video (MJPEG in an
 * `<img>`) starts when the person asks, never by itself, and not at all on mobile data or with
 * "save data" on: there a single picture shows and "Play video" starts it. The video pauses
 * itself after its allowed length and when the tab is hidden, and can be paused or closed at any
 * time. If the video will not play, a picture is fetched every second or so instead. When the
 * print is over it says so. Nothing here controls the printer.
 */
export function WatchItPrint({
  jobId,
  audience = 'student',
  frameDelayMs,
  streamSeconds,
}: WatchItPrintProps) {
  const [phase, setPhase] = useState<Phase>('closed');
  const [offer, setOffer] = useState<LiveViewOffer | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [still, setStill] = useState<string | null>(null);
  // The video is off because of mobile data, not because the person paused it.
  const [dataSaver, setDataSaver] = useState(false);
  const whose = audience === 'staff' ? 'this print' : 'your print';

  // One viewing at a time: a new one (or closing) cancels whatever the last one had in flight.
  const run = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const objectUrl = useRef<string | null>(null);

  const showBlob = useCallback((blob: Blob) => {
    const next = URL.createObjectURL(blob);
    const previous = objectUrl.current;
    objectUrl.current = next;
    setStill(next);
    if (previous) URL.revokeObjectURL(previous);
  }, []);

  const clearStill = useCallback(() => {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = null;
    setStill(null);
  }, []);

  const stop = useCallback(() => {
    run.current += 1;
    controller.current?.abort();
    controller.current = null;
  }, []);

  useEffect(
    () => () => {
      stop();
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    },
    [stop],
  );

  /** The print is over, or there is nothing to watch: say it, once. */
  const finish = useCallback((kind: 'ended' | 'unavailable', message: string) => {
    setPhase(kind);
    setNote(message);
  }, []);

  /** An offer that says no, or a failure to ask: the person is told why. */
  const explain = useCallback(
    (error: unknown) => {
      if (isLiveViewEnded(error)) {
        finish('ended', `The print has finished, so there is nothing to watch any more.`);
      } else if (error instanceof ApiError && error.code === ErrorCodes.FORBIDDEN) {
        finish('unavailable', 'You can only watch your own prints.');
      } else if (error instanceof ApiError && error.code === ErrorCodes.RATE_LIMIT_EXCEEDED) {
        finish('unavailable', 'Too many people are watching right now. Try again in a moment.');
      } else {
        finish('unavailable', 'The camera view is not available right now. Try again in a moment.');
      }
    },
    [finish],
  );

  /** One picture, held on screen (used for the paused state and as the first look on mobile data). */
  const holdOnePicture = useCallback(
    async (current: LiveViewOffer, id: number) => {
      const url = liveViewRelayUrl(jobId, current.snapshotUrl);
      if (!url) return;
      try {
        const blob = await pipelineApi.liveViewFrame(url, { signal: controller.current?.signal });
        if (run.current === id) showBlob(blob);
      } catch {
        // Without a picture the paused viewer just shows its message.
      }
    },
    [jobId, showBlob],
  );

  /** Pictures instead of video: one now, then one every interval, until paused, closed or too long. */
  const startPictures = useCallback(
    async (first: LiveViewOffer, id: number, slow: boolean) => {
      let current = first;
      const startedAt = Date.now();
      let failures = 0;
      let delay =
        frameDelayMs ??
        Math.max(
          MIN_FRAME_MS,
          Math.round((current.snapshotIntervalS ?? 1) * 1000),
          slow ? SLOW_FRAME_MS : 0,
        );
      setPhase('pictures');
      setNote(null);
      while (run.current === id) {
        const url = liveViewRelayUrl(jobId, current.snapshotUrl);
        if (!url) {
          finish('unavailable', 'The camera view is not available right now.');
          return;
        }
        try {
          const blob = await pipelineApi.liveViewFrame(url, { signal: controller.current?.signal });
          if (run.current !== id) return;
          showBlob(blob);
          failures = 0;
        } catch (error) {
          if (run.current !== id) return;
          if (error instanceof LiveViewFrameError && error.reason === 'ended') {
            finish('ended', 'The print has finished, so there is nothing to watch any more.');
            return;
          }
          if (error instanceof LiveViewFrameError && error.reason === 'forbidden') {
            finish('unavailable', 'You can only watch your own prints.');
            return;
          }
          failures += 1;
          // Asked too often: slow down instead of giving up.
          if (error instanceof LiveViewFrameError && error.reason === 'too-often') delay *= 2;
          if (failures >= MAX_FRAME_FAILURES) {
            finish('unavailable', 'The camera is not giving a picture right now. Try again later.');
            return;
          }
        }
        if (Date.now() - startedAt > FRAMES_MAX_MS) {
          setPhase('paused');
          setNote('Paused to keep the camera free for others. Resume to keep watching.');
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
        if (run.current !== id) return;
        // The view is asked for again just before it runs out.
        if (current.expiresAt && Date.parse(current.expiresAt) - Date.now() < 10_000) {
          try {
            const next = await pipelineApi.liveView(jobId, { signal: controller.current?.signal });
            if (run.current !== id) return;
            if (!next.available) {
              finish(
                next.reason === 'not_printing' ? 'ended' : 'unavailable',
                next.reason === 'not_printing'
                  ? 'The print has finished, so there is nothing to watch any more.'
                  : (REASON_TEXT[next.reason ?? ''] ?? 'The camera view is not available.'),
              );
              return;
            }
            current = next;
            setOffer(next);
          } catch (error) {
            if (run.current === id) explain(error);
            return;
          }
        }
      }
    },
    [jobId, frameDelayMs, finish, explain, showBlob],
  );

  /** Ask the backend, then show what it says: video, a picture, or why there is nothing. */
  const begin = useCallback(
    async (wantVideo: boolean) => {
      stop();
      const id = run.current;
      const abort = new AbortController();
      controller.current = abort;
      setPhase('opening');
      setNote(null);
      let next: LiveViewOffer;
      try {
        next = await pipelineApi.liveView(jobId, { signal: abort.signal });
      } catch (error) {
        if (run.current === id) explain(error);
        return;
      }
      if (run.current !== id) return;
      setOffer(next);
      if (!next.available) {
        const reason: LiveViewReason | null | undefined = next.reason;
        finish(
          reason === 'not_printing' ? 'ended' : 'unavailable',
          REASON_TEXT[reason ?? ''] ?? 'The camera view is not available.',
        );
        return;
      }
      setDataSaver(false);
      const slow = onMobileData();
      const hasStream = liveViewRelayUrl(jobId, next.streamUrl) !== null;
      if (hasStream && (wantVideo || !slow)) {
        setPhase('video');
        setNote(null);
        clearStill();
      } else if (slow && hasStream) {
        // Mobile data or save-data: one picture, and the video only when the person asks for it.
        setDataSaver(true);
        setPhase('paused');
        setNote('Video is off to save your data. Play it when you are ready.');
        await holdOnePicture(next, id);
      } else {
        await startPictures(next, id, slow);
      }
    },
    [jobId, stop, explain, finish, clearStill, holdOnePicture, startPictures],
  );

  const open = () => void begin(false);
  const close = () => {
    stop();
    clearStill();
    setOffer(null);
    setNote(null);
    setPhase('closed');
  };

  // Pause: the video connection is closed and the last picture is kept on screen.
  const pause = useCallback(
    (message: string) => {
      stop();
      const id = run.current;
      controller.current = new AbortController();
      setPhase('paused');
      setNote(message);
      if (offer) void holdOnePicture(offer, id);
    },
    [stop, offer, holdOnePicture],
  );

  // The video ends by itself after its allowed length; the viewer then asks whether to go on.
  const seconds = streamSeconds ?? offer?.maxStreamS ?? DEFAULT_STREAM_S;
  useEffect(() => {
    if (phase !== 'video') return;
    const timer = setTimeout(
      () =>
        pause('The video stopped after a while to keep the camera free. Resume to keep watching.'),
      Math.max(1, seconds) * 1000,
    );
    return () => clearTimeout(timer);
  }, [phase, seconds, pause]);

  // Nobody is looking at a hidden tab: stop using the camera and the data.
  useEffect(() => {
    if (phase !== 'video' && phase !== 'pictures') return;
    const onHide = () => {
      if (document.hidden) pause('Paused while this page was hidden. Resume to keep watching.');
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [phase, pause]);

  // The video would not play (blocked, cut, refused): ask why, and fall back to pictures if it can.
  const videoFailed = useCallback(async () => {
    const id = run.current;
    try {
      const next = await pipelineApi.liveView(jobId, { signal: controller.current?.signal });
      if (run.current !== id) return;
      if (!next.available) {
        finish(
          next.reason === 'not_printing' ? 'ended' : 'unavailable',
          next.reason === 'not_printing'
            ? 'The print has finished, so there is nothing to watch any more.'
            : (REASON_TEXT[next.reason ?? ''] ?? 'The camera view is not available.'),
        );
        return;
      }
      setOffer(next);
      await startPictures(next, id, onMobileData());
    } catch (error) {
      if (run.current === id) explain(error);
    }
  }, [jobId, finish, explain, startPictures]);

  if (phase === 'closed') {
    return (
      <Button type="button" variant="outline" className="h-11 fine:h-9" onClick={open}>
        <Video aria-hidden="true" />
        Watch it print
      </Button>
    );
  }

  const streamUrl = offer ? liveViewRelayUrl(jobId, offer.streamUrl) : null;
  const playing = phase === 'video' || phase === 'pictures';

  return (
    <section
      aria-label={`Live view of ${whose}`}
      data-testid="watch-it-print"
      data-phase={phase}
      className="space-y-3 rounded-lg border bg-card p-3"
    >
      <div className="relative aspect-video w-full overflow-hidden rounded-md bg-muted">
        {phase === 'opening' && (
          <div
            role="status"
            className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-muted-foreground"
          >
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Opening the camera…
          </div>
        )}
        {phase === 'video' && streamUrl && (
          // A stream from our own backend, which next/image cannot show (and must not optimise).
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={streamUrl}
            alt={`Live video of ${whose} on the printer`}
            className="size-full object-contain"
            onError={() => void videoFailed()}
          />
        )}
        {phase !== 'video' && phase !== 'opening' && still && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={still}
            alt={`Latest picture of ${whose} on the printer`}
            className="size-full object-contain"
          />
        )}
        {phase === 'paused' && (
          <span className="absolute top-2 left-2 rounded bg-background/80 px-2 py-0.5 text-xs">
            Paused
          </span>
        )}
      </div>

      {note && phase !== 'ended' && phase !== 'unavailable' && (
        <p className="text-sm text-muted-foreground" role="status">
          {note}
        </p>
      )}
      {(phase === 'ended' || phase === 'unavailable') && note && (
        <Alert role="status">
          <AlertDescription>{note}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {playing && (
          <Button
            type="button"
            variant="outline"
            className="h-11 fine:h-9"
            onClick={() => pause('Paused. Resume to keep watching.')}
          >
            <Pause aria-hidden="true" />
            Pause
          </Button>
        )}
        {phase === 'paused' && (
          <Button type="button" className="h-11 fine:h-9" onClick={() => void begin(true)}>
            <Play aria-hidden="true" />
            {dataSaver ? 'Play video' : 'Resume'}
          </Button>
        )}
        {phase === 'unavailable' && (
          <Button type="button" variant="outline" className="h-11 fine:h-9" onClick={open}>
            Try again
          </Button>
        )}
        <Button type="button" variant="ghost" className="h-11 fine:h-9" onClick={close}>
          <X aria-hidden="true" />
          Close
        </Button>
      </div>
    </section>
  );
}
