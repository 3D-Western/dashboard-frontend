'use client';

import { useRef, useState } from 'react';
import { Pause, Play, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatClock } from '@/lib/training-format';
import { cn } from '@/lib/utils';

export interface ScrubberMarker {
  uid: number;
  /** Seconds into the video, or null while the typed time is not a number yet. */
  at: number | null;
}

interface VideoScrubberProps {
  src: string;
  markers: ScrubberMarker[];
  selectedUid: number | null;
  onSelect: (uid: number | null) => void;
  /** "Add question here" was pressed at this whole second. */
  onAddHere: (seconds: number) => void;
  onRemove: (uid: number) => void;
  /** The player learnt the video's length (whole seconds, rounded up). */
  onDuration?: (seconds: number) => void;
}

/**
 * A video player for placing the questions that appear during it: play or scrub to a moment, press
 * "Add question here", and a marker appears on the timeline. Markers can be selected (which jumps
 * to them) and removed. The times can also be typed in the list of questions.
 */
export function VideoScrubber({
  src,
  markers,
  selectedUid,
  onSelect,
  onAddHere,
  onRemove,
  onDuration,
}: VideoScrubberProps) {
  const video = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState(0);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);

  const seek = (seconds: number) => {
    const el = video.current;
    const target = Math.min(Math.max(seconds, 0), duration || seconds);
    if (el) el.currentTime = target;
    setTime(target);
  };

  const here = Math.floor(time);
  const alreadyHere = markers.some((marker) => marker.at === here);
  const selected = markers.find((marker) => marker.uid === selectedUid) ?? null;

  const togglePlay = () => {
    const el = video.current;
    if (!el) return;
    if (el.paused) void el.play();
    else el.pause();
  };

  return (
    <div className="space-y-2" aria-label="Video player">
      <video
        ref={video}
        src={src}
        playsInline
        preload="metadata"
        aria-label="Video preview"
        className="aspect-video w-full rounded-lg bg-black"
        onLoadedMetadata={(event) => {
          const seconds = event.currentTarget.duration;
          if (Number.isFinite(seconds) && seconds > 0) {
            setDuration(seconds);
            onDuration?.(Math.ceil(seconds));
          }
          setFailed(false);
        }}
        onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onError={() => setFailed(true)}
      />

      {failed && (
        <p role="alert" className="text-sm text-destructive">
          The video could not be played here. Its link may have expired, or the browser cannot play
          this kind of file.
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-11 shrink-0 sm:size-8"
          aria-label={playing ? 'Pause' : 'Play'}
          onClick={togglePlay}
        >
          {playing ? <Pause /> : <Play />}
        </Button>
        <div className="relative min-w-0 flex-1">
          {/* Markers sit above the slider, each a button that is easy to tap */}
          <div className="relative h-6" data-testid="marker-track">
            {duration > 0 &&
              markers.map((marker) =>
                marker.at === null || marker.at > duration + 1 ? null : (
                  <button
                    key={marker.uid}
                    type="button"
                    aria-label={`Question at ${formatClock(marker.at)}`}
                    aria-pressed={marker.uid === selectedUid}
                    onClick={() => {
                      seek(marker.at!);
                      onSelect(marker.uid === selectedUid ? null : marker.uid);
                    }}
                    style={{ left: `${Math.min(100, (marker.at / duration) * 100)}%` }}
                    className="absolute top-0 flex h-6 w-6 -translate-x-1/2 items-center justify-center after:absolute after:-inset-2 after:content-['']"
                  >
                    <span
                      className={cn(
                        'size-3 rotate-45 border border-primary bg-background',
                        marker.uid === selectedUid && 'bg-primary',
                      )}
                    />
                  </button>
                ),
              )}
          </div>
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={0.1}
            value={Math.min(time, duration || 1)}
            disabled={duration === 0}
            aria-label="Video position"
            aria-valuetext={`${formatClock(time)} of ${formatClock(duration)}`}
            onChange={(event) => seek(Number(event.target.value))}
            className="h-11 w-full cursor-pointer accent-[var(--color-primary)] sm:h-6"
          />
        </div>
        <span className="w-24 shrink-0 text-right text-sm tabular-nums" aria-live="off">
          {formatClock(time)} / {formatClock(duration)}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-11 sm:h-7"
          aria-label="Back 1 second"
          disabled={duration === 0}
          onClick={() => seek(time - 1)}
        >
          -1 s
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-11 sm:h-7"
          aria-label="Forward 1 second"
          disabled={duration === 0}
          onClick={() => seek(time + 1)}
        >
          +1 s
        </Button>
        <Button
          type="button"
          className="h-11 sm:h-8"
          disabled={duration === 0 || alreadyHere}
          onClick={() => onAddHere(here)}
        >
          <Plus />{' '}
          {alreadyHere ? `A question is already at ${formatClock(here)}` : 'Add question here'}
        </Button>
      </div>

      {selected && selected.at !== null && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/50 p-2 text-sm">
          <span>Question at {formatClock(selected.at)}</span>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => seek(selected.at!)}>
              Jump to it
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                onRemove(selected.uid);
                onSelect(null);
              }}
            >
              <Trash2 /> Remove it
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
