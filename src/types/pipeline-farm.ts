// What staff see of the print farm: jobs the farm loop holds for a person, and printers it has
// quarantined. Staff only. The dashboard backend does not serve these yet; the shapes follow the
// pipeline's own operations (`FarmLoop.resolve_held` and `clear_printer_quarantine`, which both
// need the person's name and a reason, recorded) so the backend can be a thin relay. Field names
// are the backend's usual camelCase JSON.

/** A job the farm loop could not settle by itself (a lost job, a print with no bin, no known-good printer). */
export interface HeldFarmJob {
  jobId: string;
  jobName?: string | null;
  studentId?: number | null;
  studentName?: string | null;
  /** Which print attempt of the job this is (1 = the first). */
  attempt: number;
  printerId?: string | null;
  binNumber?: number | null;
  pickupTag?: string | null;
  /** Why a person is needed, in the pipeline's words. */
  reason: string;
  heldSince: string;
}

/** A printer taken out of rotation after repeated failures (P-81) until a person clears it. */
export interface PrinterQuarantine {
  printerId: string;
  /** Friendly name when the farm has one, e.g. "Printer 07". */
  name?: string | null;
  reason: string;
  consecutiveFailures: number;
  quarantinedAt: string;
}

/** GET /api/v1/admin/pipeline/farm */
export interface FarmOverview {
  heldJobs: HeldFarmJob[];
  quarantinedPrinters: PrinterQuarantine[];
}

/** POST .../farm/jobs/{jobId}/resolve: print it again, or close it (the student is told). */
export interface ResolveHeldRequest {
  retry: boolean;
  /** Always required, 3 to 1000 characters. */
  reason: string;
}

/** POST .../farm/printers/{printerId}/clear-quarantine: put the printer back live and log why it failed. */
export interface ClearQuarantineRequest {
  /** What was wrong and what was done; always required, 3 to 1000 characters (P-109). */
  reason: string;
}
