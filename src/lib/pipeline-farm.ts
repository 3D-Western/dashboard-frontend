// The logic of the staff farm screens that needs no DOM: what a request must carry (mirrors the
// backend: a `reason` to resolve a held job, a `cause` to clear a quarantine, 3 to 1000
// characters each) and ordering. Staff only.

import { REASON_MAX, REASON_MIN } from '@/lib/pipeline-review';
import type {
  BedBlock,
  ClearBedBlockRequest,
  ClearQuarantineRequest,
  FarmAgent,
  FarmSwitches,
  HeldFarmJob,
  ManualTempEntryRequest,
  ManualTempReading,
  QuarantinedPrinter,
  ResolveHeldRequest,
  RoomTemperature,
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

// -- Room temperature and the farm agent (read-only status cards) -------------------------------

/** How a status card is drawn: `ok` fine, `hold` the farm is holding new prints, `problem` look now, `off` not in use. */
export type StatusTone = 'ok' | 'hold' | 'problem' | 'off';

export interface StatusHeadline {
  tone: StatusTone;
  label: string;
}

/** "22.4 °C", or "no reading" when there is none. */
export const formatCelsius = (celsius: number | null | undefined) =>
  typeof celsius === 'number' && Number.isFinite(celsius)
    ? `${celsius.toFixed(1)} °C`
    : 'no reading';

/** A length of time in seconds, in words: "12 s", "5 min", "2 h 10 min", "3 days". */
export function formatSpan(seconds: number | null | undefined): string {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < 0) return 'unknown';
  const s = Math.round(seconds);
  if (s < 60) return `${s} s`;
  const minutes = Math.round(s / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const rest = minutes % 60;
    return rest ? `${hours} h ${rest} min` : `${hours} h`;
  }
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? 'day' : 'days'}`;
}

/** "16-27 °C", or an empty string when the pipeline sent no band. */
export function formatBand(room: Pick<RoomTemperature, 'bandMinC' | 'bandMaxC'>): string {
  const { bandMinC, bandMaxC } = room;
  return typeof bandMinC === 'number' && typeof bandMaxC === 'number'
    ? `${bandMinC}-${bandMaxC} °C`
    : '';
}

/**
 * The one-line verdict of the room-temperature watch. A missing, stale or never-checked reading is
 * a hold (or a warning when the pipeline's settings let releases go on), never "fine"; a watch that
 * nobody has asked for a long time (`checkStalled`) is a problem whatever it last said.
 */
export function roomTempHeadline(room: RoomTemperature): StatusHeadline {
  if (!room.enabled) return { tone: 'off', label: 'Watch is off' };
  if (room.checkStalled) return { tone: 'problem', label: 'Not being checked' };
  const code = room.code ?? 'unchecked';
  if (code === 'in_band' && !room.holding) return { tone: 'ok', label: 'In range' };
  const by: Record<string, string> = {
    too_hot: 'Too hot',
    too_cold: 'Too cold',
    stale: 'Reading out of date',
    missing: 'No reading',
    unchecked: 'Not checked yet',
  };
  const what = by[code] ?? 'Out of range';
  return room.holding
    ? { tone: 'hold', label: `${what}: holding new prints` }
    : { tone: 'problem', label: `${what}: printing anyway` };
}

/** The one-line verdict of the farm agent: silent, never seen or reporting trouble is a problem. */
export function agentHeadline(agent: FarmAgent): StatusHeadline {
  if (agent.state === 'not_used') return { tone: 'off', label: 'No farm agent in use' };
  if (agent.state === 'never_connected') return { tone: 'problem', label: 'Never connected' };
  if (agent.state === 'silent') {
    const seconds = agent.silentForS;
    return {
      tone: 'problem',
      label: typeof seconds === 'number' ? `Silent for ${formatSpan(seconds)}` : 'Silent',
    };
  }
  return agent.problem
    ? { tone: 'problem', label: 'Online, with problems' }
    : { tone: 'ok', label: 'Online' };
}

export type KillSwitch = NonNullable<FarmSwitches['kill']>;

/** What the agent's kill switch does, in words. */
export const KILL_LABEL: Record<KillSwitch, string> = {
  off: 'Off (the agent works)',
  writes: 'On: refuses everything that changes the farm',
  all: 'On: refuses everything',
};

// -- Staff thermometer readings (P-174) -------------------------------------------------------

/** The backend's bounds on a typed temperature, and on the note. The pipeline's own typo check is narrower (-10 to 50 °C by default). */
export const TEMP_MIN_C = -60;
export const TEMP_MAX_C = 100;
export const TEMP_NOTE_MAX = 500;

/** A temperature typed as "23", "23.5" or "23,5" (and "°C" or "C" after it); null when it is not a number. */
export function parseCelsius(text: string): number | null {
  const cleaned = text
    .trim()
    .replace(/\s*°?\s*c$/i, '')
    .replace(',', '.');
  if (!/^[-+]?(\d+\.?\d*|\.\d+)$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

/** What is wrong with the typed temperature and note, or null when both can be sent. */
export function validateReading(text: string, note: string): string | null {
  if (text.trim() === '') return 'Type what the thermometer shows.';
  const celsius = parseCelsius(text);
  if (celsius === null) return 'The temperature must be a number, like 23 or 23.5.';
  if (celsius < TEMP_MIN_C || celsius > TEMP_MAX_C) {
    return `The temperature must be between ${TEMP_MIN_C} and ${TEMP_MAX_C} °C.`;
  }
  if (note.trim().length > TEMP_NOTE_MAX) {
    return `The note can be at most ${TEMP_NOTE_MAX} characters.`;
  }
  return null;
}

/** The request for a typed temperature and note (call `validateReading` first). */
export function buildReadingRequest(text: string, note: string): ManualTempEntryRequest {
  const celsius = parseCelsius(text);
  if (celsius === null) throw new Error('The temperature must be a number');
  return { celsius, ...(note.trim() ? { note: note.trim() } : {}) };
}

/** A reading's state in a word for the list. */
export function readingState(reading: ManualTempReading): 'withdrawn' | 'in use' | 'earlier' {
  if (reading.withdrawnAt) return 'withdrawn';
  return reading.inUse ? 'in use' : 'earlier';
}
