// The logic of the staff farm screens that needs no DOM: what a request must carry (mirrors the
// backend: a `reason` to resolve a held job, a `cause` to clear a quarantine, 3 to 1000
// characters each) and ordering. Staff only.

import { REASON_MAX, REASON_MIN } from '@/lib/pipeline-review';
import type {
  BedBlock,
  ClearBedBlockRequest,
  ClearQuarantineRequest,
  HeldFarmJob,
  QuarantinedPrinter,
  ResolveHeldRequest,
  SetBedReferenceRequest,
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

// -- The empty-bed check (P-106) -----------------------------------------------------------------

/** The backend's longest note on a bed action. */
export const BED_NOTE_MAX = 2000;

/** What the camera check found, in words for staff. */
export const BED_VERDICT_LABEL: Record<BedBlock['verdict'], string> = {
  not_clear: 'Bed not clear',
  unsure: 'Could not tell',
};

/** Printers held back by the empty-bed check, the longest-waiting first. */
export const bedBlocksOldestFirst = (blocks: readonly BedBlock[]) =>
  [...blocks].sort((a, b) => time(a.blockedAt) - time(b.blockedAt));

/** The printer ids the backend accepts in a path (letters, digits, `_ . : -`, not only dots, up to 128). */
export const isPrinterId = (id: string) => /^(?!\.+$)[A-Za-z0-9_.:-]{1,128}$/.test(id);

/** An optional note: nothing to check but its length. */
export function validateBedNote(note: string): string | null {
  return note.trim().length > BED_NOTE_MAX
    ? `The note can be at most ${BED_NOTE_MAX} characters.`
    : null;
}

export const buildClearBedRequest = (note: string): ClearBedBlockRequest =>
  note.trim() ? { note: note.trim() } : {};

/** `confirmed` is always true here: the dialog only sends once the person has ticked the box. */
export const buildReferenceRequest = (note: string): SetBedReferenceRequest => ({
  confirmed: true,
  ...(note.trim() ? { note: note.trim() } : {}),
});
