'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Maximize2, Pause, Play } from 'lucide-react';
import { trainingAPI } from '@/api/client/training';
import { trainingErrorMessage } from '@/api/client/training-errors';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { formatClock } from '@/lib/training-format';
import {
  SEEK_TOLERANCE_SECONDS,
  WatchTracker,
  firstOpenCheckpoint,
  furthestWatched,
  seekLimit,
} from '@/lib/video-watch';
import type { AttemptStep, VideoCheckpoint, VideoPlayback } from '@/types/training';
import { QuestionCard } from './QuestionCard';

/** How often (while playing) progress is reported to the server. */
export const HEARTBEAT_INTERVAL_MS = 10_000;
/** Ask for a fresh video URL when the current one is about to expire. */
const URL_REFRESH_MARGIN_MS = 60_000;
/** When the server could not credit everything yet ("capped"), try again after this long, a few times. */
const CAPPED_RETRY_MS = 10_000;
const CAPPED_RETRY_LIMIT = 6;
/** No automatic re-fetching of the URL more often than this when the video keeps failing. */
const ERROR_REFRESH_GAP_MS = 15_000;

export const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 3, 4];

interface VideoStepProps {
  attemptId: number;
  step: AttemptStep;
  /** Called when the server says this step is complete (the player then reloads the attempt). */
  onStepCompleted: () => void;
}

export function VideoStep({ attemptId, step, onStepCompleted }: VideoStepProps) {
  const block = step.video!;
  const stepId = step.stepId;

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Mutable playback bookkeeping. None of it is rendered directly, so refs keep handlers cheap.
  const trackerRef = useRef(new WatchTracker());
  const furthestRef = useRef(furthestWatched(block.watchedRanges));
  const pendingFocusLossRef = useRef(0);
  const awayRef = useRef(false);
  const passedRef = useRef<Set<number>>(
    new Set(block.checkpoints.filter((c) => c.passed).map((c) => c.checkpointId)),
  );
  const activeCheckpointRef = useRef<VideoCheckpoint | null>(null);
  const expiresAtRef = useRef(0);
  const resumeRef = useRef<{ time: number; play: boolean } | null>(null);
  const firstLoadRef = useRef(true);
  const completedRef = useRef(false);
  const inFlightRef = useRef(false);
  const queuedRef = useRef(false);
  const lastSentRef = useRef('');
  const cappedRetriesRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastErrorRefreshRef = useRef(0);
  const rateRef = useRef(1);

  const [playback, setPlayback] = useState<VideoPlayback | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(block.durationSeconds);
  const [rate, setRate] = useState(1);
  const [watchedPercent, setWatchedPercent] = useState(Number(block.watchedPercent) || 0);
  const [activeCheckpoint, setActiveCheckpoint] = useState<VideoCheckpoint | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [checking, setChecking] = useState(false);
  const [checkpointMessage, setCheckpointMessage] = useState<string | null>(null);
  const [checkpointError, setCheckpointError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // This component only ever renders in the browser (after the attempt has loaded), so no hydration concern
  const canFullscreen = typeof document !== 'undefined' && !!document.fullscreenEnabled;

  const showCheckpoint = useCallback((checkpoint: VideoCheckpoint | null) => {
    activeCheckpointRef.current = checkpoint;
    setActiveCheckpoint(checkpoint);
    setSelected([]);
    setCheckpointError(null);
  }, []);

  // ---- Heartbeat ----------------------------------------------------------------------------

  const sendHeartbeatRef = useRef<(force?: boolean) => Promise<void>>(async () => undefined);

  const sendHeartbeat = useCallback(
    async (force = false) => {
      if (completedRef.current) return;
      if (inFlightRef.current) {
        queuedRef.current = true;
        return;
      }
      const ranges = trackerRef.current.snapshot();
      const focusLossCount = pendingFocusLossRef.current;
      const key = JSON.stringify(ranges);
      // Nothing new to say
      if (!force && focusLossCount === 0 && (ranges.length === 0 || key === lastSentRef.current)) {
        return;
      }

      inFlightRef.current = true;
      try {
        const result = await trainingAPI.sendHeartbeat(attemptId, stepId, {
          ranges,
          focusLossCount,
        });
        lastSentRef.current = key;
        pendingFocusLossRef.current = Math.max(0, pendingFocusLossRef.current - focusLossCount);
        setWatchedPercent(Number(result.watchedPercent) || 0);
        // Trust the server about which checkpoints are still open
        for (const checkpoint of block.checkpoints) {
          if (!result.checkpointsRemaining.includes(checkpoint.checkpointId)) {
            passedRef.current.add(checkpoint.checkpointId);
          }
        }
        if (result.stepCompleted) {
          completedRef.current = true;
          onStepCompleted();
        } else if (result.capped && cappedRetriesRef.current < CAPPED_RETRY_LIMIT) {
          // Part of what we claimed was refused for now; a later heartbeat credits it.
          cappedRetriesRef.current += 1;
          retryTimerRef.current = setTimeout(
            () => void sendHeartbeatRef.current(true),
            CAPPED_RETRY_MS,
          );
        } else {
          cappedRetriesRef.current = 0;
        }
      } catch {
        // Keep the counts: the next heartbeat carries them. The learner does not need to know.
      } finally {
        inFlightRef.current = false;
        if (queuedRef.current) {
          queuedRef.current = false;
          void sendHeartbeatRef.current();
        }
      }
    },
    [attemptId, stepId, block.checkpoints, onStepCompleted],
  );

  // (assigned below, once sendHeartbeat exists)
  useEffect(() => {
    sendHeartbeatRef.current = sendHeartbeat;
  }, [sendHeartbeat]);

  const stopInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startInterval = useCallback(() => {
    stopInterval();
    intervalRef.current = setInterval(() => void sendHeartbeatRef.current(), HEARTBEAT_INTERVAL_MS);
  }, [stopInterval]);

  // ---- Playback URL ---------------------------------------------------------------------------

  const loadPlayback = useCallback(
    async (resume?: { time: number; play: boolean }) => {
      try {
        resumeRef.current = resume ?? null;
        const next = await trainingAPI.getPlaybackUrl(attemptId, stepId);
        expiresAtRef.current = new Date(next.expiresAt).getTime();
        setPlayback(next);
        setLoadError(null);
        if (next.durationSeconds) setDuration(next.durationSeconds);
      } catch (error) {
        resumeRef.current = null;
        setLoadError(trainingErrorMessage(error, "We couldn't load the video. Please try again."));
      }
    },
    [attemptId, stepId],
  );

  useEffect(() => {
    // Asking for the URL also starts the server's clock for watch credit.
    const run = async () => {
      await loadPlayback();
    };
    run();
  }, [loadPlayback]);

  // Final heartbeat and timers on the way out
  useEffect(() => {
    const tracker = trackerRef.current;
    return () => {
      stopInterval();
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      tracker.breakSegment();
      void sendHeartbeatRef.current();
    };
  }, [stopInterval]);

  // ---- Pause when the tab or window loses focus ----------------------------------------------

  useEffect(() => {
    const lose = () => {
      if (awayRef.current) return; // one episode counts once, even if blur and visibilitychange both fire
      awayRef.current = true;
      const video = videoRef.current;
      if (video && !video.paused && !video.ended) {
        // Count first: the pause event sends a heartbeat, and it has to carry this loss
        pendingFocusLossRef.current += 1;
        video.pause();
        setNotice("Paused because you switched away. Press play when you're back.");
      }
    };
    const regain = () => {
      awayRef.current = false;
    };
    const onVisibility = () => (document.hidden ? lose() : regain());

    window.addEventListener('blur', lose);
    window.addEventListener('focus', regain);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('blur', lose);
      window.removeEventListener('focus', regain);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  // ---- Video events ---------------------------------------------------------------------------

  const openCheckpoint = () => firstOpenCheckpoint(block.checkpoints, passedRef.current);

  const maybeAskCheckpoint = (time: number, atEnd = false) => {
    if (activeCheckpointRef.current) return;
    const open = openCheckpoint();
    if (
      open &&
      (time >= open.atSeconds || (atEnd && open.atSeconds >= duration - SEEK_TOLERANCE_SECONDS))
    ) {
      videoRef.current?.pause();
      showCheckpoint(open);
    }
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    if (Number.isFinite(video.duration) && video.duration > 0) setDuration(video.duration);
    const resume = resumeRef.current;
    if (resume) {
      resumeRef.current = null;
      video.currentTime = resume.time;
      if (resume.play) void video.play()?.catch(() => undefined);
    } else if (firstLoadRef.current) {
      // First load: carry on from where they got to last time
      firstLoadRef.current = false;
      const open = openCheckpoint();
      const resumeAt = open ? Math.min(furthestRef.current, open.atSeconds) : furthestRef.current;
      if (resumeAt > 5 && !completedRef.current) video.currentTime = resumeAt;
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    const time = video.currentTime;
    setCurrentTime(time);
    if (!video.seeking && !video.paused) {
      trackerRef.current.sample(time, video.playbackRate || rateRef.current);
      if (time > furthestRef.current) furthestRef.current = time;
    }
    maybeAskCheckpoint(time);
  };

  const handleSeeking = () => {
    const video = videoRef.current;
    if (!video) return;
    trackerRef.current.breakSegment();
    const limit = seekLimit(furthestRef.current, openCheckpoint());
    if (video.currentTime > limit) {
      // Forward seeking past what they've watched is blocked; send them back to the edge.
      video.currentTime = Math.max(0, limit - SEEK_TOLERANCE_SECONDS);
      setNotice("You can't skip ahead of what you've watched. Going back is always fine.");
    }
  };

  const handlePlay = () => {
    setPlaying(true);
    setNotice(null);
    startInterval();
  };

  const handlePause = () => {
    setPlaying(false);
    stopInterval();
    trackerRef.current.breakSegment();
    void sendHeartbeat();
  };

  const handleEnded = () => {
    setPlaying(false);
    stopInterval();
    trackerRef.current.breakSegment();
    const video = videoRef.current;
    maybeAskCheckpoint(video?.currentTime ?? duration, true);
    void sendHeartbeat(true);
  };

  const handleRateChange = () => {
    const video = videoRef.current;
    if (!video) return;
    rateRef.current = video.playbackRate;
    setRate(video.playbackRate);
  };

  const handleError = () => {
    // A presigned URL stops working when it expires; get a new one (not in a tight loop).
    const now = Date.now();
    if (now - lastErrorRefreshRef.current < ERROR_REFRESH_GAP_MS) {
      setLoadError('The video stopped loading. Check your connection, then try again.');
      return;
    }
    lastErrorRefreshRef.current = now;
    const video = videoRef.current;
    void loadPlayback({ time: video?.currentTime ?? 0, play: false });
  };

  // ---- Controls -------------------------------------------------------------------------------

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video || activeCheckpointRef.current) return;
    if (!video.paused) {
      video.pause();
      return;
    }
    if (expiresAtRef.current && Date.now() > expiresAtRef.current - URL_REFRESH_MARGIN_MS) {
      await loadPlayback({ time: video.currentTime, play: true });
      return;
    }
    setNotice(null);
    void video.play()?.catch(() => undefined);
  };

  const handleSeekInput = (value: number) => {
    const video = videoRef.current;
    if (!video || activeCheckpointRef.current) return;
    // The furthest point they may jump to: what they've watched, and never past an open question
    const limit = seekLimit(furthestRef.current, openCheckpoint()) - SEEK_TOLERANCE_SECONDS;
    if (value > limit + SEEK_TOLERANCE_SECONDS) {
      setNotice("You can't skip ahead of what you've watched. Going back is always fine.");
    }
    video.currentTime = Math.max(0, Math.min(value, limit));
    setCurrentTime(video.currentTime);
  };

  const handleRate = (value: number) => {
    const video = videoRef.current;
    if (video) video.playbackRate = value;
    rateRef.current = value;
    setRate(value);
  };

  const handleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void containerRef.current?.requestFullscreen?.();
    }
  };

  // ---- Checkpoint question --------------------------------------------------------------------

  const submitCheckpoint = async () => {
    const checkpoint = activeCheckpointRef.current;
    if (!checkpoint || selected.length === 0) return;
    setChecking(true);
    setCheckpointError(null);
    try {
      const result = await trainingAPI.answerCheckpoint(
        attemptId,
        stepId,
        checkpoint.checkpointId,
        selected,
      );
      const video = videoRef.current;
      if (result.correct) {
        passedRef.current.add(checkpoint.checkpointId);
        setCheckpointMessage(null);
        showCheckpoint(null);
        if (result.stepCompleted) {
          completedRef.current = true;
          onStepCompleted();
        } else if (video && !video.ended) {
          void video.play()?.catch(() => undefined);
        }
      } else {
        // Wrong: watch that part again. We never learn or show the right answer.
        const from = result.rewatchFromSeconds ?? 0;
        setCheckpointMessage("That wasn't right. Let's watch that part again.");
        showCheckpoint(null);
        if (video) {
          video.currentTime = from;
          setCurrentTime(from);
          void video.play()?.catch(() => undefined);
        }
      }
    } catch (error) {
      setCheckpointError(trainingErrorMessage(error));
    } finally {
      setChecking(false);
    }
  };

  // ---- Render ---------------------------------------------------------------------------------

  const controlsLocked = !!activeCheckpoint;
  const maxSeek = Math.max(duration, 1);

  return (
    <div className="space-y-3">
      <div ref={containerRef} className="overflow-hidden rounded-xl border bg-card">
        <div className="relative aspect-video w-full bg-black">
          {playback ? (
            <video
              ref={videoRef}
              src={playback.url}
              className="size-full"
              playsInline
              preload="metadata"
              controls={false}
              disablePictureInPicture
              disableRemotePlayback
              aria-label={step.title}
              onLoadedMetadata={handleLoadedMetadata}
              onTimeUpdate={handleTimeUpdate}
              onSeeking={handleSeeking}
              onPlay={handlePlay}
              onPause={handlePause}
              onEnded={handleEnded}
              onRateChange={handleRateChange}
              onError={handleError}
              onClick={() => void togglePlay()}
            />
          ) : loadError ? null : (
            <Skeleton className="size-full rounded-none" role="status" aria-label="Loading video" />
          )}
        </div>

        <div className="space-y-2 p-3">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              size="icon"
              onClick={() => void togglePlay()}
              disabled={!playback || controlsLocked}
              aria-label={playing ? 'Pause' : 'Play'}
            >
              {playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
            </Button>
            <span className="text-sm text-muted-foreground tabular-nums" aria-hidden="true">
              {formatClock(currentTime)} / {formatClock(duration)}
            </span>
            <div className="ml-auto flex items-center gap-2">
              <label className="sr-only" htmlFor={`rate-${stepId}`}>
                Playback speed
              </label>
              <select
                id={`rate-${stepId}`}
                value={rate}
                onChange={(event) => handleRate(Number(event.target.value))}
                className="h-10 rounded-lg border bg-background px-2 text-sm sm:h-8"
              >
                {PLAYBACK_RATES.map((value) => (
                  <option key={value} value={value}>
                    {value}x
                  </option>
                ))}
              </select>
              {canFullscreen && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleFullscreen}
                  aria-label="Full screen"
                >
                  <Maximize2 aria-hidden="true" />
                </Button>
              )}
            </div>
          </div>

          <input
            type="range"
            min={0}
            max={maxSeek}
            step={0.1}
            value={Math.min(currentTime, maxSeek)}
            onChange={(event) => handleSeekInput(Number(event.target.value))}
            disabled={!playback || controlsLocked}
            aria-label="Video position"
            aria-valuetext={`${formatClock(currentTime)} of ${formatClock(duration)}`}
            className="h-6 w-full accent-purple-light"
          />

          {activeCheckpoint && (
            <div className="space-y-3 rounded-lg border border-purple-light/50 bg-purple-light/5 p-3">
              <p className="text-sm font-medium text-purple-light">
                Quick question about what you just watched
              </p>
              <QuestionCard
                question={activeCheckpoint.question}
                selected={selected}
                onChange={setSelected}
                disabled={checking}
              />
              {checkpointError && (
                <Alert variant="destructive">
                  <AlertDescription>{checkpointError}</AlertDescription>
                </Alert>
              )}
              <Button
                type="button"
                onClick={() => void submitCheckpoint()}
                disabled={checking || selected.length === 0}
                className="w-full sm:w-auto"
              >
                {checking ? 'Checking...' : 'Check my answer'}
              </Button>
            </div>
          )}
        </div>
      </div>

      <div aria-live="polite" className="space-y-2">
        {checkpointMessage && !activeCheckpoint && (
          <Alert variant="warning" role="status">
            <AlertDescription>{checkpointMessage}</AlertDescription>
          </Alert>
        )}
        {notice && (
          <Alert role="status">
            <AlertDescription>{notice}</AlertDescription>
          </Alert>
        )}
      </div>

      {loadError && (
        <Alert variant="destructive">
          <AlertDescription className="space-y-2">
            <span>{loadError}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void loadPlayback({ time: currentTime, play: false })}
            >
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-1">
        <div
          role="progressbar"
          aria-label="Video watched"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(watchedPercent)}
          className="h-2 w-full overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full bg-linear-to-r from-purple-dark to-purple-light transition-all"
            style={{ width: `${Math.min(100, Math.max(0, watchedPercent))}%` }}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          Watched {Math.round(watchedPercent)}%. Watch at least {block.minWatchPercent}% to
          continue. Playing at any speed is fine, and the video pauses if you switch tabs.
        </p>
      </div>
    </div>
  );
}
