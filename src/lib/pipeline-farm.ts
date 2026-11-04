// The logic of the staff farm screens that needs no DOM: what a request must carry (mirrors the
// pipeline's rule that resolving a held job or clearing a quarantine always has a person's
// reason) and ordering. Staff only.

import { REASON_MAX, REASON_MIN } from '@/lib/pipeline-review';
import type {
  ClearQuarantineRequest,
  HeldFarmJob,
  PrinterQuarantine,
  ResolveHeldRequest,
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

export const buildResolveRequest = (choice: HeldChoice, reason: string): ResolveHeldRequest => ({
  retry: choice === 'retry',
  reason: reason.trim(),
});

export const buildClearRequest = (reason: string): ClearQuarantineRequest => ({
  reason: reason.trim(),
});

const byOldest = <T>(items: readonly T[], when: (item: T) => string) =>
  [...items].sort((a, b) => new Date(when(a)).getTime() - new Date(when(b)).getTime());

/** Held jobs, the longest-waiting student first. */
export const heldOldestFirst = (jobs: readonly HeldFarmJob[]) =>
  byOldest(jobs, (job) => job.heldSince);

/** Quarantined printers, the longest-idle printer first. */
export const quarantinedOldestFirst = (printers: readonly PrinterQuarantine[]) =>
  byOldest(printers, (printer) => printer.quarantinedAt);

export const printerLabel = (printer: Pick<PrinterQuarantine, 'name' | 'printerId'>) =>
  printer.name ? `${printer.name} (${printer.printerId})` : `Printer ${printer.printerId}`;
