// The logic of the staff farm screens that needs no DOM: what a request must carry (mirrors the
// backend: a `reason` to resolve a held job, a `cause` to clear a quarantine, 3 to 1000
// characters each) and ordering. Staff only.

import { REASON_MAX, REASON_MIN } from '@/lib/pipeline-review';
import type {
  ClearQuarantineRequest,
  HeldFarmJob,
  QuarantinedPrinter,
  ResolveHeldRequest,
  WaiveRatingRequest,
} from '@/types/pipeline-farm';

/** What a held job can be resolved to. */
export type HeldChoice = 'retry' | 'close';

export const HELD_CHOICE_LABEL: Record<HeldChoice, string> = {
  retry: 'Print again',
  close: 'Close the job',
};

export const HELD_CHOICE_HELP: Record<HeldChoice, string> = {
  retry: 'Queues another print attempt on a printer known to work.',
  close: 'Cancels the job, frees its tag and tells the student. This cannot be undone.',
};

/** The same bounds as a review decision: 3 to 1000 characters once trimmed. */
export function validateReason(reason: string): string | null {
  const trimmed = reason.trim();
  if (trimmed.length === 0) return 'A reason is required.';
  if (trimmed.length < REASON_MIN) return `The reason must be at least ${REASON_MIN} characters.`;
  if (trimmed.length > REASON_MAX) return `The reason can be at most ${REASON_MAX} characters.`;
  return null;
}

export const buildWaiveRequest = (reason: string): WaiveRatingRequest => ({
  reason: reason.trim(),
});

export const buildResolveRequest = (choice: HeldChoice, reason: string): ResolveHeldRequest => ({
  retry: choice === 'retry',
  reason: reason.trim(),
});

export const buildClearRequest = (cause: string): ClearQuarantineRequest => ({
  cause: cause.trim(),
});

const time = (iso: string | null | undefined) => (iso ? new Date(iso).getTime() : Infinity);

/** Held jobs, the longest-waiting student first. */
export const heldOldestFirst = (jobs: readonly HeldFarmJob[]) =>
  [...jobs].sort((a, b) => time(a.since) - time(b.since));

/** Quarantined printers, the longest-idle printer first (unknown times last). */
export const quarantinedOldestFirst = (printers: readonly QuarantinedPrinter[]) =>
  [...printers].sort((a, b) => time(a.quarantinedAt) - time(b.quarantinedAt));

export const printerLabel = (printer: Pick<QuarantinedPrinter, 'printerId'>) =>
  `Printer ${printer.printerId}`;
