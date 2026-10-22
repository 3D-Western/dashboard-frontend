import type { CertificationStatus, TrainingSummary } from '@/types/training';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/** "in 12 minutes", "in 3 hours", or a calendar time for anything further away. */
export function formatWhen(iso: string, now: Date = new Date()): string {
  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) return 'later';
  const diff = target.getTime() - now.getTime();
  if (diff <= 0) return 'now';
  if (diff < MINUTE) return 'in under a minute';
  if (diff < HOUR) {
    const minutes = Math.ceil(diff / MINUTE);
    return `in ${minutes} minute${minutes === 1 ? '' : 's'}`;
  }
  if (diff < 24 * HOUR) {
    const hours = Math.ceil(diff / HOUR);
    return `in ${hours} hour${hours === 1 ? '' : 's'}`;
  }
  return `on ${target.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}`;
}

/** A plain date such as "March 4, 2027". */
export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

/** Whole days from now until [iso] (negative when already past). */
export function daysUntil(iso: string, now: Date = new Date()): number {
  return Math.ceil((new Date(iso).getTime() - now.getTime()) / (24 * HOUR));
}

/** "2:05" or "12:30" for a video position. */
export function formatClock(totalSeconds: number): string {
  const safe = Number.isFinite(totalSeconds) && totalSeconds > 0 ? Math.floor(totalSeconds) : 0;
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * What to show for a training. The backend leaves the certification at IN_PROGRESS after a failed
 * (or cancelled) attempt, so IN_PROGRESS with no attempt actually open means "not passed yet".
 */
export type DisplayStatus = CertificationStatus | 'NOT_PASSED';

export const CERTIFICATION_LABELS: Record<DisplayStatus, string> = {
  IN_PROGRESS: 'In progress',
  NOT_PASSED: 'Not passed yet',
  AWAITING_SIGNOFF: 'Awaiting sign-off',
  ACTIVE: 'Certified',
  REFRESHER_DUE: 'Refresher due',
  LAPSED: 'Lapsed',
  REVOKED: 'Revoked',
};

export type StatusTone = 'success' | 'warning' | 'danger' | 'neutral' | 'info';

export const CERTIFICATION_TONES: Record<DisplayStatus, StatusTone> = {
  IN_PROGRESS: 'info',
  NOT_PASSED: 'warning',
  AWAITING_SIGNOFF: 'warning',
  ACTIVE: 'success',
  REFRESHER_DUE: 'warning',
  LAPSED: 'danger',
  REVOKED: 'danger',
};

/** The status to show for a training row, or null if the member has not started it. */
export function displayStatus(training: TrainingSummary): DisplayStatus | null {
  const status = training.certification?.status;
  if (!status) return null;
  if (status === 'IN_PROGRESS' && training.nextAction !== 'RESUME') return 'NOT_PASSED';
  return status;
}

/** Started before, nothing open now, not certified: they have not passed yet. */
export function isNotPassed(training: TrainingSummary): boolean {
  return displayStatus(training) === 'NOT_PASSED';
}

/** The status line for a training row, in plain words. */
export function statusLabel(training: TrainingSummary): string {
  const status = displayStatus(training);
  return status ? CERTIFICATION_LABELS[status] : 'Not started';
}

/** True when a training counts as "done" for the dashboard summary (certified, even if a refresher is due). */
export function isCertified(training: TrainingSummary): boolean {
  const status = training.certification?.status;
  return status === 'ACTIVE' || status === 'REFRESHER_DUE';
}
