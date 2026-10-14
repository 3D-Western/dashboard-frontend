'use client';

import { useSyncExternalStore } from 'react';
import { cn } from '@/lib/utils';

const MINUTE_MS = 60_000;

// Re-render once a minute so the time left and the bar keep moving
function subscribe(onTick: () => void) {
  const interval = setInterval(onTick, MINUTE_MS);
  return () => clearInterval(interval);
}
const getCurrentMinute = () => Math.floor(Date.now() / MINUTE_MS);
// The server can't know the viewer's "now", so it renders the no-estimate state
const getServerMinute = () => null;

function formatTimeLeft(ms: number) {
  const totalMinutes = Math.round(ms / MINUTE_MS);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m left` : `${minutes}m left`;
}

interface PrintProgressProps {
  /** When the job moved to Printing (from its status history) */
  startedAt?: string;
  /** The backend's estimated completion time (jobETA) */
  estimatedCompletion?: string;
  className?: string;
  /** Width of the bar itself; the default suits the jobs list */
  barClassName?: string;
}

/**
 * Estimated print progress, worked out from when printing started and the estimated finish time.
 * It's an estimate, not live printer data. Without both times it shows an indeterminate bar.
 */
export function PrintProgress({
  startedAt,
  estimatedCompletion,
  className,
  barClassName = 'sm:w-40',
}: PrintProgressProps) {
  const minute = useSyncExternalStore(subscribe, getCurrentMinute, getServerMinute);
  const now = minute === null ? null : minute * MINUTE_MS;
  const start = startedAt ? Date.parse(startedAt) : NaN;
  const end = estimatedCompletion ? Date.parse(estimatedCompletion) : NaN;

  let percent: number | null = null;
  let timeText = 'On the printer';
  if (now !== null && !Number.isNaN(end)) {
    const remaining = end - now;
    timeText = remaining >= MINUTE_MS ? formatTimeLeft(remaining) : 'Finishing up';
    if (!Number.isNaN(start) && end > start) {
      percent = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
    }
  }

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <span className="text-xs whitespace-nowrap text-muted-foreground">{timeText}</span>
      <div
        role="progressbar"
        aria-label="Estimated print progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent === null ? undefined : Math.round(percent)}
        aria-valuetext={timeText}
        className={cn('h-7 w-full overflow-hidden rounded-md border bg-background', barClassName)}
      >
        {percent === null ? (
          <div className="h-full w-full animate-pulse bg-status-green/30" />
        ) : (
          <div
            className="h-full bg-status-green transition-[width] duration-700"
            style={{ width: `${percent}%` }}
          />
        )}
      </div>
    </div>
  );
}
