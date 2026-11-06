import { http, HttpResponse } from 'msw';
import { PERMISSIONS } from '@/constants/permissions';
import type {
  BedBlock,
  ClearBedBlockRequest,
  ClearQuarantineRequest,
  FarmActionResult,
  FarmAgent,
  HeldFarmJob,
  ManualTempEntryRequest,
  ManualTempReading,
  QuarantinedPrinter,
  ResolveHeldRequest,
  RoomTemperature,
  SetBedReferenceRequest,
  WaiveRatingRequest,
} from '@/types/pipeline-farm';
import { endpoints } from '../client/endpoints';
import db from './database/db';
import { mockWaiveRating } from './pipeline-handlers';
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
const bedBlocks = new Map<string, BedBlock>();
/** Printers with a saved empty-bed reference (the mock keeps no picture: it draws one). */
const references = new Set<string>();
/** Staff thermometer readings, newest entered last. */
const thermometer = new Map<number, ManualTempReading>();
let nextReadingId = 1;

/** The room-temperature watch and the farm agent as the pipeline would report them (the mock keeps them as plain values). */
let mockRoom: RoomTemperature;
let mockAgent: FarmAgent;

const switches = {
  farmLiveEnabled: false,
  agentLiveEnabled: true,
  kill: 'off',
  liveViewEnabled: false,
  emptyBedEnabled: false,
  roomTempEnabled: true,
} as const;

/** Replace what the mock reports for the room-temperature watch or the farm agent (for tests and demos). */
export function setMockFarmStatus(status: {
  room?: Partial<RoomTemperature>;
  agent?: Partial<FarmAgent>;
}) {
  if (status.room) mockRoom = { ...mockRoom, ...status.room };
  if (status.agent) mockAgent = { ...mockAgent, ...status.agent };
}

/** Fresh seed data (also used by tests that want a known farm). */
export function resetMockFarm() {
  mockRoom = {
    enabled: true,
    loopRunning: true,
    code: 'in_band',
    holding: false,
    summary: 'The room is 22.4 C, inside 16-27 C: new prints can start.',
    celsius: 22.4,
    readingAt: hoursAgo(0.01),
    readingAgeS: 36,
    source: 'idle printers',
    bandMinC: 16,
    bandMaxC: 27,
    hysteresisC: 1,
    staleAfterS: 900,
    since: hoursAgo(5),
    checkedAt: hoursAgo(0.001),
    checkAgeS: 4,
    checkStalled: false,
    heldJobCount: 0,
    heldJobs: [],
    task: null,
  };
  mockAgent = {
    configured: true,
    transport: 'remote',
    agentId: 'farm-pc',
    state: 'online',
    problem: false,
    problems: [],
    silentAlertS: 300,
    lastContactAt: hoursAgo(0.001),
    silentForS: 3,
    lastPollAt: hoursAgo(0.001),
    lastHeartbeatAt: hoursAgo(0.005),
    heartbeatAgeS: 18,
    version: '1.0.0',
    busy: false,
    uptimeS: 86_400,
    relayFailures: 0,
    commandsRun: 412,
    farmOk: true,
    farmProblems: [],
    openCommands: 0,
    switches: { ...switches },
  };
  heldJobs.clear();
  quarantined.clear();
  bedBlocks.clear();
  references.clear();
  references.add('P07');
  thermometer.clear();
  nextReadingId = 1;
  bedBlocks.set('P09', {
    printerId: 'P09',
    verdict: 'not_clear',
    code: 'bed.part_left',
    reason: 'Something is on the plate: the picture differs from the empty-bed reference.',
    blockedAt: hoursAgo(3),
    lastCheckedAt: hoursAgo(0.5),
  });
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

  http.get(`${apiUrl}${endpoints.pipelineFarm.roomTemperature}`, ({ cookies }) => {
    const { response } = staff(cookies);
    if (response) return response;
    return HttpResponse.json(generateSuccessResponse(mockRoom));
  }),

  http.get(`${apiUrl}${endpoints.pipelineFarm.agent}`, ({ cookies }) => {
    const { response } = staff(cookies);
    if (response) return response;
    return HttpResponse.json(generateSuccessResponse(mockAgent));
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
    `${apiUrl}${endpoints.pipelineFarm.waiveRating(':jobId')}`,
    async ({ cookies, params, request }) => {
      const { response } = staff(cookies);
      if (response) return response;
      const body = (await request.json()) as Partial<WaiveRatingRequest>;
      const invalid = textProblem('reason', body.reason);
      if (invalid) return invalid;
      const outcome = mockWaiveRating(String(params.jobId));
      if (outcome === 'not-collected') {
        return apiError(
          409,
          'CONFLICT',
          'That print is not collected, so there is nothing to waive.',
        );
      }
      if (outcome === 'already-rated') {
        return apiError(409, 'CONFLICT', 'That print already has a rating.');
      }
      return ok('The rating is waived. The student can start a new print.');
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

  // Staff thermometer readings (P-175): the pipeline refuses a typing mistake (outside -10 to 50 C) with its reason.
  http.get(`${apiUrl}${endpoints.pipelineFarm.roomTemperatureReadings}`, ({ cookies }) => {
    const { response } = staff(cookies);
    if (response) return response;
    const newest = [...thermometer.values()].reverse();
    const inUse = newest.find((r) => !r.withdrawnAt)?.id;
    return HttpResponse.json(
      generateSuccessResponse(newest.map((r) => ({ ...r, inUse: r.id === inUse }))),
    );
  }),

  http.post(
    `${apiUrl}${endpoints.pipelineFarm.roomTemperatureReadings}`,
    async ({ cookies, request }) => {
      const { response, user } = staff(cookies);
      if (response) return response;
      const body = (await request.json().catch(() => ({}))) as Partial<ManualTempEntryRequest>;
      if (typeof body.celsius !== 'number' || !Number.isFinite(body.celsius)) {
        return apiError(400, 'VALIDATION_FAILED', 'celsius is required');
      }
      if (body.celsius < -10 || body.celsius > 50) {
        return apiError(
          400,
          'INVALID_STAFF_DECISION',
          `${body.celsius} C is outside -10 to 50 C, so it looks like a typing mistake; check the thermometer`,
        );
      }
      const now = new Date().toISOString();
      const reading: ManualTempReading = {
        id: nextReadingId++,
        celsius: body.celsius,
        takenAt: body.takenAt ?? now,
        enteredAt: now,
        enteredBy: [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Staff',
        note: body.note ?? null,
        withdrawnAt: null,
        withdrawnBy: null,
        inUse: true,
      };
      thermometer.set(reading.id, reading);
      return HttpResponse.json(generateSuccessResponse(reading));
    },
  ),

  http.post(
    `${apiUrl}${endpoints.pipelineFarm.withdrawRoomTemperature(':readingId')}`,
    ({ cookies, params }) => {
      const { response, user } = staff(cookies);
      if (response) return response;
      const reading = thermometer.get(Number(params.readingId));
      if (!reading || reading.withdrawnAt) {
        return apiError(409, 'CONFLICT', 'There is no such reading, or it was withdrawn already');
      }
      reading.withdrawnAt = new Date().toISOString();
      reading.withdrawnBy = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Staff';
      return ok('The reading was withdrawn');
    },
  ),

  // The empty-bed check (P-106): the printers held back, "the bed is clear", and the reference picture.
  http.get(`${apiUrl}${endpoints.pipelineFarm.bedBlocks}`, ({ cookies }) => {
    const { response } = staff(cookies);
    if (response) return response;
    return HttpResponse.json(generateSuccessResponse([...bedBlocks.values()]));
  }),

  http.post(
    `${apiUrl}${endpoints.pipelineFarm.clearBedBlock(':printerId')}`,
    async ({ cookies, params, request }) => {
      const { response } = staff(cookies);
      if (response) return response;
      const body = (await request.json().catch(() => ({}))) as Partial<ClearBedBlockRequest>;
      if (typeof body.note === 'string' && body.note.length > 2000) {
        return apiError(400, 'VALIDATION_FAILED', 'note must be at most 2000 characters');
      }
      const printerId = decodeURIComponent(String(params.printerId));
      if (!bedBlocks.delete(printerId)) {
        return apiError(409, 'CONFLICT', 'That printer has no empty-bed block.');
      }
      return ok('The printer takes jobs again.');
    },
  ),

  http.post(
    `${apiUrl}${endpoints.pipelineFarm.bedReference(':printerId')}`,
    async ({ cookies, params, request }) => {
      const { response } = staff(cookies);
      if (response) return response;
      const body = (await request.json().catch(() => ({}))) as Partial<SetBedReferenceRequest>;
      if (body.confirmed !== true) {
        return apiError(
          400,
          'VALIDATION_FAILED',
          'Confirm that the bed is empty and the chamber light is on',
        );
      }
      const printerId = decodeURIComponent(String(params.printerId));
      references.add(printerId);
      bedBlocks.delete(printerId);
      return ok('The camera’s picture is now this printer’s empty-bed reference.');
    },
  ),

  http.get(
    `${apiUrl}${endpoints.pipelineFarm.bedReference(':printerId')}`,
    ({ cookies, params }) => {
      const { response } = staff(cookies);
      if (response) return response;
      const printerId = decodeURIComponent(String(params.printerId));
      if (!references.has(printerId)) {
        return apiError(
          404,
          'NOT_FOUND',
          'No empty-bed reference picture is saved for this printer yet',
        );
      }
      const svg =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360"><rect width="640" height="360" fill="#2a2f38"/>' +
        '<rect x="80" y="280" width="480" height="14" rx="4" fill="#3b424d"/>' +
        `<text x="24" y="40" fill="#e6edf3" font-family="monospace" font-size="20">mock empty bed: ${printerId}</text></svg>`;
      return new HttpResponse(svg, {
        headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-store' },
      });
    },
  ),
];
