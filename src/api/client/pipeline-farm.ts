import type {
  ClearQuarantineRequest,
  FarmActionResult,
  HeldFarmJob,
  QuarantinedPrinter,
  ResolveHeldRequest,
} from '@/types/pipeline-farm';
import { apiRequest } from './base';
import { endpoints } from './endpoints';
import { getBaseUrl } from './utils';

/**
 * The staff side of the print farm: jobs the farm loop holds for a person, and quarantined
 * printers. Every endpoint needs `jobs:update_status` (any scope) and goes to the pipeline at
 * once (503 when it cannot be reached). Staff pages only.
 */

const request = <T>(path: string, init: RequestInit = {}) =>
  apiRequest<T>(`${getBaseUrl()}${path}`, { credentials: 'include', ...init });

const post = <T>(path: string, body: unknown) =>
  request<T>(path, { method: 'POST', body: JSON.stringify(body) });

export const pipelineFarmApi = {
  /** Jobs held for a person, oldest first, with why. */
  heldJobs: (options?: RequestInit) =>
    request<HeldFarmJob[]>(endpoints.pipelineFarm.heldJobs, { method: 'GET', ...options }),

  /**
   * Print a held job again (`retry`), or close it as cancelled and tell the student. A reason is
   * required; 409 when the job is no longer held.
   */
  resolveHeld: (jobId: string, body: ResolveHeldRequest) =>
    post<FarmActionResult>(endpoints.pipelineFarm.resolveHeld(jobId), body),

  /** Printers taken out of service after repeated failures, oldest first. */
  quarantinedPrinters: (options?: RequestInit) =>
    request<QuarantinedPrinter[]>(endpoints.pipelineFarm.quarantinedPrinters, {
      method: 'GET',
      ...options,
    }),

  /**
   * Puts a quarantined printer back live. The `cause` of the trouble is required (it is logged
   * by the pipeline with the caller); 409 when the printer is not quarantined.
   */
  clearQuarantine: (printerId: string, body: ClearQuarantineRequest) =>
    post<FarmActionResult>(endpoints.pipelineFarm.clearQuarantine(printerId), body),
};
