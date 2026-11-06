// What staff see of the print farm: jobs the farm loop holds for a person, and printers it has
// quarantined. Staff only. These are the dashboard backend's own shapes (dashboard-backend
// entities/pipeline/staff/StaffFarmModels.kt, StaffFarmController.kt under
// /api/v1/admin/pipeline/farm): camelCase JSON, nulls left out.

import type { StaffStatus } from './pipeline-review';

/** GET .../farm/held-jobs: a job the farm loop could not settle by itself, oldest first. */
export interface HeldFarmJob {
  jobId: string;
  jobName?: string | null;
  studentName?: string | null;
  staffStatus?: StaffStatus | null;
  /** Which print attempt of the job this is (1 = the first). */
  attemptNo: number;
  /** The farm connector's opaque id of the attempt. */
  jobRef?: string | null;
  printerId?: string | null;
  pickupTag?: string | null;
  /** Why the farm loop needs a person, in the pipeline's words. */
  needsPerson?: string | null;
  since: string;
}

/** GET .../farm/quarantined-printers: a printer taken out of rotation after repeated failures (P-81). */
export interface QuarantinedPrinter {
  printerId: string;
  quarantinedAt?: string | null;
  reason?: string | null;
  consecutiveFailures: number;
}

/** POST .../farm/held-jobs/{jobId}/resolve: print it again, or close it (the student is told). */
export interface ResolveHeldRequest {
  retry: boolean;
  /** Always required, 3 to 1000 characters. */
  reason: string;
}

/** POST .../farm/printers/{printerId}/clear-quarantine: put the printer back live and log why it failed. */
export interface ClearQuarantineRequest {
  /** What was wrong and what was done; required, 3 to 1000 characters (P-109). */
  cause: string;
  /** Optional, up to 2000 characters. */
  notes?: string;
}

/** POST .../farm/jobs/{jobId}/waive-rating: let one collected print through the rate-first gate (P-20). */
export interface WaiveRatingRequest {
  /** Always required, 3 to 1000 characters; kept in the job's audit log. */
  reason: string;
}

/**
 * GET .../farm/bed-blocks: a printer the empty-bed check holds back (P-106), the `clear_bed` task.
 * `verdict` says whether the camera saw something on the bed (`not_clear`) or could not tell (`unsure`).
 */
export interface BedBlock {
  printerId: string;
  verdict: 'not_clear' | 'unsure';
  code: string;
  /** The pipeline's words, for staff only. */
  reason: string;
  blockedAt: string;
  lastCheckedAt: string;
  /** The job whose release the check stopped, when there was one. */
  jobId?: string | null;
}

/** POST .../farm/printers/{printerId}/clear-bed-block: "I looked, the bed is clear". */
export interface ClearBedBlockRequest {
  /** Optional, up to 2000 characters. */
  note?: string;
}

/** POST .../farm/printers/{printerId}/bed-reference: the camera's picture now becomes the printer's empty-bed reference. */
export interface SetBedReferenceRequest {
  /** Must be true: the person is looking at the printer, the bed is empty and the chamber light is on. */
  confirmed: true;
  /** Optional, up to 2000 characters. */
  note?: string;
}

/**
 * The room-temperature watch's states. A value a later pipeline adds still reads (as plain text),
 * so the card never breaks on it.
 */
export type RoomTempCode =
  | 'in_band'
  | 'too_cold'
  | 'too_hot'
  | 'stale'
  | 'missing'
  | 'unchecked'
  | (string & {});

/** A job waiting for a printer while the room-temperature watch holds. */
export interface RoomHeldJob {
  jobId: string;
  jobName?: string | null;
  studentName?: string | null;
  staffStatus?: StaffStatus | null;
}

/** The open supervisor task of the room-temperature watch (`room_temp`). */
export interface RoomTempTask {
  key: string;
  /** 1 urgent, 2 soon, 3 routine. */
  priority: number;
  title: string;
  detail: string;
  since?: string | null;
}

/**
 * GET .../farm/room-temperature: what the pipeline's room-temperature watch last decided. "No
 * reading" and "stale" are holds, never fine: `holding` says whether new prints are held back.
 * When `enabled` is false nothing else is a reading (the watch is off; it is off by default).
 */
export interface RoomTemperature {
  enabled: boolean;
  loopRunning: boolean;
  code?: RoomTempCode | null;
  holding: boolean;
  /** The pipeline's one-sentence status, for staff. */
  summary: string;
  reason?: string | null;
  celsius?: number | null;
  readingAt?: string | null;
  readingAgeS?: number | null;
  source?: string | null;
  bandMinC?: number | null;
  bandMaxC?: number | null;
  hysteresisC?: number | null;
  staleAfterS?: number | null;
  since?: string | null;
  checkedAt?: string | null;
  checkAgeS?: number | null;
  /** The pipeline's farm loop has not asked the watch for a long time: this answer is out of date. */
  checkStalled: boolean;
  heldJobCount: number;
  heldJobs: RoomHeldJob[];
  task?: RoomTempTask | null;
}

/** The live switches. The agent's two are absent until it has reported. */
export interface FarmSwitches {
  /** `farm.live_enabled`: the pipeline may act on the real farm. */
  farmLiveEnabled: boolean;
  /** The farm agent's own switch. */
  agentLiveEnabled?: boolean | null;
  /** The agent's kill-switch file. */
  kill?: 'off' | 'writes' | 'all' | null;
  liveViewEnabled: boolean;
  emptyBedEnabled: boolean;
  roomTempEnabled: boolean;
}

/**
 * GET .../farm/agent: the farm agent on the server PC as the pipeline sees it. `state` is
 * `not_used` (the pipeline talks to the farm directly), `never_connected`, `online` or `silent`;
 * `problem` is true for anything a person should look at (`problems` says what), including an
 * agent silent for more than `silentAlertS` (five minutes).
 */
export interface FarmAgent {
  configured: boolean;
  transport: string;
  agentId?: string | null;
  state: 'not_used' | 'never_connected' | 'online' | 'silent' | (string & {});
  problem: boolean;
  problems: string[];
  silentAlertS?: number | null;
  lastContactAt?: string | null;
  silentForS?: number | null;
  lastPollAt?: string | null;
  lastHeartbeatAt?: string | null;
  heartbeatAgeS?: number | null;
  version?: string | null;
  busy?: boolean | null;
  uptimeS?: number | null;
  relayFailures?: number | null;
  commandsRun?: number | null;
  farmOk?: boolean | null;
  farmProblems: string[];
  openCommands: number;
  oldestOpenCommandAgeS?: number | null;
  switches: FarmSwitches;
}

/** What a farm action did. */
export interface FarmActionResult {
  ok: boolean;
  message: string;
}

/**
 * GET .../farm/room-temperature/readings: one staff thermometer reading as the pipeline keeps it.
 * `enteredBy` is the name of the person who entered it; `inUse` marks the newest entry that is not
 * withdrawn and still fresh (the one the watch may be using; idle printers can still outvote it).
 */
export interface ManualTempReading {
  id: number;
  celsius: number;
  takenAt: string;
  enteredAt: string;
  enteredBy: string;
  note?: string | null;
  withdrawnAt?: string | null;
  withdrawnBy?: string | null;
  inUse: boolean;
}

/** POST .../farm/room-temperature/readings: a staff member read a thermometer in the room. */
export interface ManualTempEntryRequest {
  /** Degrees C, from -60 to 100; the pipeline refuses a number that cannot be a room (a typing mistake). */
  celsius: number;
  /** When it was read, if not just now (an ISO time with its zone). */
  takenAt?: string;
  /** Optional, up to 500 characters. */
  note?: string;
}
