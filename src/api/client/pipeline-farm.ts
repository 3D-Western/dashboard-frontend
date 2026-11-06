import type {
  BedBlock,
  ClearBedBlockRequest,
  ClearQuarantineRequest,
  FarmActionResult,
  HeldFarmJob,
  QuarantinedPrinter,
  ResolveHeldRequest,
  SetBedReferenceRequest,
  WaiveRatingRequest,
} from '@/types/pipeline-farm';
import { apiRequest } from './base';
import { ApiError, ErrorCodes } from './errors';
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

  /**
   * Lets one collected print through the rate-first gate without a rating (P-20), e.g. when the
   * student cannot rate it. A reason is required and audited; 409 when the print is not
   * collected or already has a real rating.
   */
  waiveRating: (jobId: string, body: WaiveRatingRequest) =>
    post<FarmActionResult>(endpoints.pipelineFarm.waiveRating(jobId), body),

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

  /** Printers the empty-bed check holds back (P-106), oldest first; empty while the check is off. */
  bedBlocks: (options?: RequestInit) =>
    request<BedBlock[]>(endpoints.pipelineFarm.bedBlocks, { method: 'GET', ...options }),

  /** "I looked, the bed is clear": lifts the block. The note is optional; 409 when the printer has no block. */
  clearBedBlock: (printerId: string, body: ClearBedBlockRequest = {}) =>
    post<FarmActionResult>(endpoints.pipelineFarm.clearBedBlock(printerId), body),

  /**
   * The camera's picture now becomes the printer's empty-bed reference, and a block on it is lifted.
   * Only for a person looking at an empty bed with the chamber light on (`confirmed: true`).
   * Takes a few seconds; 409 when the pipeline could not use the picture (no camera, too dark or flat).
   */
  setBedReference: (printerId: string, body: SetBedReferenceRequest) =>
    post<FarmActionResult>(endpoints.pipelineFarm.bedReference(printerId), body),

  /**
   * The saved reference picture as an image, or null when none is saved yet (404). Throws an
   * ApiError (503) when the pipeline cannot show reference pictures yet.
   */
  bedReference: async (printerId: string, options: { signal?: AbortSignal } = {}) => {
    let response: Response;
    try {
      response = await fetch(`${getBaseUrl()}${endpoints.pipelineFarm.bedReference(printerId)}`, {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
        signal: options.signal,
      });
    } catch (error) {
      if (options.signal?.aborted) throw error;
      throw new ApiError(ErrorCodes.REQUEST_FAILED, 'The reference picture could not be loaded');
    }
    if (response.ok) return response.blob();
    if (response.status === 404) return null;
    let message = 'The reference picture could not be loaded.';
    let code: string = ErrorCodes.REQUEST_FAILED;
    try {
      const body = (await response.json()) as { error?: { code?: string; message?: string } };
      if (body.error?.message) message = body.error.message;
      if (body.error?.code) code = body.error.code;
    } catch {
      // Not JSON: the fixed message above stands.
    }
    throw new ApiError(code, message);
  },
};
