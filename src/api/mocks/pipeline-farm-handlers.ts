import { http, HttpResponse } from 'msw';
import { PERMISSIONS } from '@/constants/permissions';
import type {
  ClearQuarantineRequest,
  FarmOverview,
  HeldFarmJob,
  PrinterQuarantine,
  ResolveHeldRequest,
} from '@/types/pipeline-farm';
import { endpoints } from '../client/endpoints';
import db from './database/db';
import {
  createInvalidSessionResponse,
  generateSuccessResponse,
  mockUserHasPermission,
} from './utils';

const apiUrl = process.env.API_URL;

// The staff farm API with an in-memory store, so the farm screens can be built before the
// dashboard backend serves them. It follows the pipeline's rules: a held job is resolved with a
// person's reason (retry or close), a quarantine is cleared with the cause. Needs jobs:update_status.

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3600_000).toISOString();

const heldJobs = new Map<string, HeldFarmJob>();
const quarantined = new Map<string, PrinterQuarantine>();

/** Fresh seed data (also used by tests that want a known farm). */
export function resetMockFarm() {
  heldJobs.clear();
  quarantined.clear();
  [
    {
      jobId: '22222222-2222-4222-8222-000000000001',
      jobName: 'Bracket Mount',
      studentId: 251100001,
      studentName: 'Sam Rivera',
      attempt: 2,
      printerId: 'P07',
      binNumber: 7,
      pickupTag: 'K7Q2',
      reason:
        'The print failed and no printer is known to be good yet; a person must pick where it goes.',
      heldSince: hoursAgo(6),
    },
    {
      jobId: '22222222-2222-4222-8222-000000000002',
      jobName: 'Gear Housing',
      studentId: 251100002,
      studentName: 'Priya Nair',
      attempt: 1,
      printerId: null,
      binNumber: null,
      pickupTag: 'M3X9',
      reason: 'The farm cannot say what happened to this job: it is not in any printer or queue.',
      heldSince: hoursAgo(2),
    },
  ].forEach((job) => heldJobs.set(job.jobId, job));
  [
    {
      printerId: 'P12',
      name: 'Printer 12',
      reason: '3 failed prints in a row (limit 3); a person must check the printer and clear this.',
      consecutiveFailures: 3,
      quarantinedAt: hoursAgo(20),
    },
  ].forEach((printer) => quarantined.set(printer.printerId, printer));
}
resetMockFarm();

const apiError = (status: number, code: string, message: string) =>
  HttpResponse.json({ success: false, data: null, error: { code, message } }, { status });

/** The pipeline's and the backend's rule for every farm action: a reason of 3 to 1000 characters. */
const reasonProblem = (reason: unknown) =>
  typeof reason !== 'string' || reason.trim().length < 3 || reason.trim().length > 1000
    ? apiError(422, 'VALIDATION_FAILED', 'reason must be 3 to 1000 characters')
    : null;

function staff(cookies: Record<string, string>) {
  const user = db.validateSession(cookies['sessionToken'] || '');
  if (!user) return { response: createInvalidSessionResponse() };
  if (!mockUserHasPermission(user, PERMISSIONS.JOBS_UPDATE_STATUS)) {
    return { response: apiError(403, 'FORBIDDEN', 'Staff only') };
  }
  return { user };
}

export const pipelineFarmHandlers = [
  http.get(`${apiUrl}${endpoints.pipelineFarm.overview}`, ({ cookies }) => {
    const { response } = staff(cookies);
    if (response) return response;
    const overview: FarmOverview = {
      heldJobs: [...heldJobs.values()],
      quarantinedPrinters: [...quarantined.values()],
    };
    return HttpResponse.json(generateSuccessResponse(overview));
  }),

  http.post(
    `${apiUrl}${endpoints.pipelineFarm.resolveHeld(':jobId')}`,
    async ({ cookies, params, request }) => {
      const { response } = staff(cookies);
      if (response) return response;
      const body = (await request.json()) as Partial<ResolveHeldRequest>;
      const invalid = reasonProblem(body.reason);
      if (invalid) return invalid;
      if (typeof body.retry !== 'boolean') {
        return apiError(422, 'VALIDATION_FAILED', 'retry must be true or false');
      }
      const jobId = String(params.jobId);
      if (!heldJobs.has(jobId))
        return apiError(409, 'CONFLICT', 'That job is not held by the farm.');
      heldJobs.delete(jobId);
      return HttpResponse.json(generateSuccessResponse(null), { status: 202 });
    },
  ),

  http.post(
    `${apiUrl}${endpoints.pipelineFarm.clearQuarantine(':printerId')}`,
    async ({ cookies, params, request }) => {
      const { response } = staff(cookies);
      if (response) return response;
      const body = (await request.json()) as Partial<ClearQuarantineRequest>;
      const invalid = reasonProblem(body.reason);
      if (invalid) return invalid;
      const printerId = decodeURIComponent(String(params.printerId));
      if (!quarantined.has(printerId)) {
        return apiError(409, 'CONFLICT', 'That printer is not quarantined.');
      }
      quarantined.delete(printerId);
      return HttpResponse.json(generateSuccessResponse(null), { status: 202 });
    },
  ),
];
