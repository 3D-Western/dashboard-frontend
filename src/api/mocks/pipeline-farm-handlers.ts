import { http, HttpResponse } from 'msw';
import { PERMISSIONS } from '@/constants/permissions';
import type {
  ClearQuarantineRequest,
  FarmActionResult,
  HeldFarmJob,
  QuarantinedPrinter,
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

// The staff farm API (dashboard-backend StaffFarmController) with an in-memory store, so the farm
// screens work without the backend: a held job is resolved with a reason (retry or close), a
// quarantine is cleared with the cause. Needs jobs:update_status.

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3600_000).toISOString();

const heldJobs = new Map<string, HeldFarmJob>();
const quarantined = new Map<string, QuarantinedPrinter>();

/** Fresh seed data (also used by tests that want a known farm). */
export function resetMockFarm() {
  heldJobs.clear();
  quarantined.clear();
  [
    {
      jobId: '22222222-2222-4222-8222-000000000001',
      jobName: 'Bracket Mount',
      studentName: 'Sam Rivera',
      staffStatus: 'held',
      attemptNo: 2,
      jobRef: 'job-2222-a2',
      printerId: 'P07',
      pickupTag: 'K7Q2',
      needsPerson:
        'The print failed and no printer is known to be good yet; a person must pick where it goes.',
      since: hoursAgo(6),
    },
    {
      jobId: '22222222-2222-4222-8222-000000000002',
      jobName: 'Gear Housing',
      studentName: 'Priya Nair',
      staffStatus: 'held',
      attemptNo: 1,
      jobRef: 'job-2222-a1',
      printerId: null,
      pickupTag: 'M3X9',
      needsPerson:
        'The farm cannot say what happened to this job: it is not in any printer or queue.',
      since: hoursAgo(2),
    },
  ].forEach((job) => heldJobs.set(job.jobId, job as HeldFarmJob));
  [
    {
      printerId: 'P12',
      reason: '3 failed prints in a row (limit 3); a person must check the printer and clear this.',
      consecutiveFailures: 3,
      quarantinedAt: hoursAgo(20),
    },
  ].forEach((printer) => quarantined.set(printer.printerId, printer));
}
resetMockFarm();

const apiError = (status: number, code: string, message: string) =>
  HttpResponse.json({ success: false, data: null, error: { code, message } }, { status });

/** The backend's rule for every farm action: a reason (or cause) of 3 to 1000 characters. */
const textProblem = (field: string, value: unknown) =>
  typeof value !== 'string' || value.trim().length < 3 || value.trim().length > 1000
    ? apiError(400, 'VALIDATION_FAILED', `${field} must be 3 to 1000 characters`)
    : null;

const ok = (message: string) =>
  HttpResponse.json(generateSuccessResponse({ ok: true, message } satisfies FarmActionResult));

function staff(cookies: Record<string, string>) {
  const user = db.validateSession(cookies['sessionToken'] || '');
  if (!user) return { response: createInvalidSessionResponse() };
  if (!mockUserHasPermission(user, PERMISSIONS.JOBS_UPDATE_STATUS)) {
    return { response: apiError(403, 'FORBIDDEN', 'Staff only') };
  }
  return { user };
}

export const pipelineFarmHandlers = [
  http.get(`${apiUrl}${endpoints.pipelineFarm.heldJobs}`, ({ cookies }) => {
    const { response } = staff(cookies);
    if (response) return response;
    return HttpResponse.json(generateSuccessResponse([...heldJobs.values()]));
  }),

  http.get(`${apiUrl}${endpoints.pipelineFarm.quarantinedPrinters}`, ({ cookies }) => {
    const { response } = staff(cookies);
    if (response) return response;
    return HttpResponse.json(generateSuccessResponse([...quarantined.values()]));
  }),

  http.post(
    `${apiUrl}${endpoints.pipelineFarm.resolveHeld(':jobId')}`,
    async ({ cookies, params, request }) => {
      const { response } = staff(cookies);
      if (response) return response;
      const body = (await request.json()) as Partial<ResolveHeldRequest>;
      if (typeof body.retry !== 'boolean') {
        return apiError(400, 'VALIDATION_FAILED', 'retry is required');
      }
      const invalid = textProblem('reason', body.reason);
      if (invalid) return invalid;
      const jobId = String(params.jobId);
      if (!heldJobs.has(jobId))
        return apiError(409, 'CONFLICT', 'That job is not held by the farm.');
      heldJobs.delete(jobId);
      return ok(
        body.retry ? 'The job will be printed again.' : 'The job was closed and the student told.',
      );
    },
  ),

  http.post(
    `${apiUrl}${endpoints.pipelineFarm.clearQuarantine(':printerId')}`,
    async ({ cookies, params, request }) => {
      const { response } = staff(cookies);
      if (response) return response;
      const body = (await request.json()) as Partial<ClearQuarantineRequest>;
      const invalid = textProblem('cause', body.cause);
      if (invalid) return invalid;
      const printerId = decodeURIComponent(String(params.printerId));
      if (!quarantined.has(printerId)) {
        return apiError(409, 'CONFLICT', 'That printer is not quarantined.');
      }
      quarantined.delete(printerId);
      return ok('The printer is back live and the cause is logged.');
    },
  ),
];
