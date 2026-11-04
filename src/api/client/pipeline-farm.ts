import type {
  ClearQuarantineRequest,
  FarmOverview,
  ResolveHeldRequest,
} from '@/types/pipeline-farm';
import { apiRequest } from './base';
import { endpoints } from './endpoints';
import { getBaseUrl } from './utils';

/**
 * The staff side of the print farm: jobs the farm loop holds for a person, and quarantined
 * printers. Every endpoint needs `jobs:update_status` (any scope). Staff pages only.
 */

const request = <T>(path: string, init: RequestInit = {}) =>
  apiRequest<T>(`${getBaseUrl()}${path}`, { credentials: 'include', ...init });

export const pipelineFarmApi = {
  /** Held jobs and quarantined printers, oldest first. */
  overview: (options?: RequestInit) =>
    request<FarmOverview>(endpoints.pipelineFarm.overview, { method: 'GET', ...options }),

  /** Print a held job again (`retry`), or close it and tell the student. A reason is required. */
  resolveHeld: (jobId: string, body: ResolveHeldRequest) =>
    request<void>(endpoints.pipelineFarm.resolveHeld(jobId), {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  /** Puts a quarantined printer back live and logs why it failed. A reason is required. */
  clearQuarantine: (printerId: string, body: ClearQuarantineRequest) =>
    request<void>(endpoints.pipelineFarm.clearQuarantine(printerId), {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};
