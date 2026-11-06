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

/** What a farm action did. */
export interface FarmActionResult {
  ok: boolean;
  message: string;
}
