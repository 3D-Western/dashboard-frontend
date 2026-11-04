import { http, HttpResponse } from 'msw';
import { endpoints } from '../client/endpoints';
import type {
  PipelineHealth,
  PipelineSubmission,
  ProblemReport,
  ReportStatus,
  ResolveReportRequest,
  StaffDecisionRequest,
  StaffDecisionResult,
  StaffDecisionType,
  StaffEvent,
  StaffJobView,
  StaffStatus,
  SubmissionStatus,
} from '@/types/pipeline-review';
import type { StudentStatus } from '@/types/pipeline';
import { PERMISSIONS } from '@/constants/permissions';
import {
  createFinding,
  createProblemReport,
  createQueueItem,
  createQueueResponse,
  createReportQueueItem,
  createStaffDecisionRecord,
  createStaffEvent,
  createStaffJobView,
  createSubmission,
} from '../../../test/utils/pipelineReviewFactories';
import db from './database/db';
import {
  createInvalidSessionResponse,
  generateSuccessResponse,
  mockUserHasPermission,
} from './utils';

const apiUrl = process.env.API_URL;

// The staff review API (dashboard-backend PipelineAdminController) with an in-memory store, so the
// review pages can be built without the pipeline. Every route needs a session with
// jobs:update_status (like the backend); resolve_escalation also needs jobs:resolve_escalation.

const DECISION_ORDER: StaffDecisionType[] = [
  'release',
  'approve',
  'reject',
  'escalate',
  'resolve_escalation',
  'rerun',
  'cancel',
];

const DEFAULT_QUEUE_STATUSES: StaffStatus[] = [
  'held',
  'silent_review',
  'escalated',
  'cannot_print',
  'print_failed',
];

const TERMINAL_STATUSES: StaffStatus[] = [
  'collected',
  'not_collected',
  'rejected',
  'cancelled',
  'expired',
];

/** The statuses each decision is possible from (cancel is from every non-terminal status). */
const DECISION_FROM: Record<Exclude<StaffDecisionType, 'cancel'>, StaffStatus[]> = {
  release: ['held', 'silent_review'],
  approve: ['held', 'silent_review'],
  escalate: ['held', 'silent_review'],
  resolve_escalation: ['escalated'],
  reject: ['held', 'silent_review', 'escalated', 'cannot_print', 'awaiting_student'],
  rerun: ['held', 'silent_review', 'cannot_print', 'print_failed', 'awaiting_student'],
};

/** The staff status a decision moves the job to. */
const NEXT_STAFF_STATUS: Record<StaffDecisionType, StaffStatus> = {
  release: 'queued',
  approve: 'queued',
  reject: 'rejected',
  escalate: 'escalated',
  resolve_escalation: 'silent_review',
  rerun: 'reprinting',
  cancel: 'cancelled',
};

/** The student status a few staff statuses show; the others keep the job's student status. */
const STUDENT_STATUS_FOR: Partial<Record<StaffStatus, StudentStatus>> = {
  queued: 'queued',
  reprinting: 'reprinting',
  rejected: 'rejected',
  cancelled: 'cancelled',
};

function allowedDecisionsFor(
  status: StaffStatus | null | undefined,
  canResolve: boolean,
): StaffDecisionType[] {
  if (!status || TERMINAL_STATUSES.includes(status)) return [];
  return DECISION_ORDER.filter(
    (decision) =>
      (decision !== 'resolve_escalation' || canResolve) &&
      (decision === 'cancel' || DECISION_FROM[decision].includes(status)),
  );
}

const nowIso = () => new Date().toISOString();

const apiError = (status: number, code: string, message: string) =>
  HttpResponse.json({ success: false, data: null, error: { code, message } }, { status });

const staffOnly = () => apiError(403, 'FORBIDDEN', 'Staff only');

const sessionUser = (cookies: Record<string, string>) =>
  db.validateSession(cookies['sessionToken'] || '');

// -- Seed data ----------------------------------------------------------------------------------

const svgUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

// Stand-ins for the pipeline's grey screening renders and the part preview.
const renderSvg = (view: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="#d4d4d8"/>` +
  `<path d="M50 140V70h30v40h70v30z" fill="#71717a"/><path d="M80 70h30l60 40H80z" fill="#a1a1aa"/>` +
  `<text x="10" y="190" font-size="14" fill="#3f3f46">${view}</text></svg>`;
const PART_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="#1c1f26"/>' +
  '<rect x="40" y="215" width="320" height="14" rx="4" fill="#2d333d"/>' +
  '<path d="M110 215V120h40v60h130v35z" fill="#8a38f5"/><path d="M150 120h40l90 60H150z" fill="#a96cf8"/></svg>';

const JOB = {
  bracket: '11111111-1111-4111-8111-000000000001',
  hook: '11111111-1111-4111-8111-000000000002',
  gear: '11111111-1111-4111-8111-000000000003',
  vase: '11111111-1111-4111-8111-000000000004',
  phone: '11111111-1111-4111-8111-000000000005',
  clip: '11111111-1111-4111-8111-000000000006',
};

/** A single notice event for a seeded job that is not the held story. */
const notice = (
  staffStatus: StaffStatus,
  studentStatus: StudentStatus,
  message: string,
  findingCodes: string[] = [],
): StaffEvent[] => [
  createStaffEvent({
    seq: 1,
    type: 'notice',
    staffStatus,
    studentStatus,
    studentVisible: false,
    message,
    findingCodes,
  }),
];

interface StoredJob {
  view: StaffJobView;
  /** When the job entered its current staff status (the queue sorts on it). */
  since: string;
}

const jobs = new Map<string, StoredJob>(
  [
    {
      since: '2026-11-03T13:45:00Z',
      view: createStaffJobView({
        jobId: JOB.clip,
        name: 'Plate clip',
        owner: { studentId: 251100006, name: 'Ben Foster' },
        createdAt: '2026-11-03T13:30:00Z',
        updatedAt: '2026-11-03T13:45:00Z',
        findings: [
          createFinding({
            code: 'overhang.minor',
            component: 'checker.overhangs',
            severity: 'choice',
            message: 'A small overhang at 48 degrees. Supports would make it cleaner.',
            value: 48,
            threshold: 45,
            unit: 'deg',
            region: { faces: [1] },
            action: 'choice',
          }),
        ],
        findingsSeq: 1,
      }),
    },
    {
      since: '2026-11-03T14:00:00Z',
      view: createStaffJobView({
        jobId: JOB.bracket,
        plan: {
          ...createStaffJobView().plan!,
          artifacts: [{ kind: 'preview_png', url: svgUrl(PART_SVG) }],
        },
        events: [
          ...createStaffJobView().events,
          createStaffEvent({
            seq: 4,
            type: 'status',
            occurredAt: '2026-11-03T14:00:30Z',
            staffStatus: 'held',
            studentStatus: 'preparing',
            studentVisible: false,
            data: {
              staff_artifacts: ['front', 'side', 'top', 'iso'].map((name) => ({
                kind: 'screening_png',
                name,
                url: svgUrl(renderSvg(name)),
              })),
            },
          }),
        ],
      }),
    },
    {
      since: '2026-11-03T14:40:00Z',
      view: createStaffJobView({
        jobId: JOB.vase,
        name: 'Vase lid',
        owner: { studentId: 251100004, name: 'Lee Chen' },
        createdAt: '2026-11-03T14:20:00Z',
        updatedAt: '2026-11-03T14:40:00Z',
        staffStatus: 'cannot_print',
        studentStatus: 'cannot_print',
        findings: [
          createFinding({
            severity: 'cannot_print',
            message: 'The walls are 0.3 mm thick; no printer here can make them.',
            value: 0.3,
            threshold: 0.8,
            action: 'cannot_print',
          }),
        ],
        events: notice('cannot_print', 'cannot_print', 'Cannot print: walls below 0.8 mm.', [
          'walls.too_thin',
        ]),
      }),
    },
    {
      since: '2026-11-03T15:30:00Z',
      view: createStaffJobView({
        jobId: JOB.hook,
        name: 'Hook mount',
        owner: { studentId: 251100002, name: 'Priya Nair' },
        createdAt: '2026-11-03T15:10:00Z',
        updatedAt: '2026-11-03T15:30:00Z',
        staffStatus: 'silent_review',
        studentStatus: 'queued',
        findings: [
          createFinding({
            code: 'surface.minor_stringing',
            component: 'checker.surface',
            severity: 'adjusted',
            message: 'Thin gaps may leave a few fine strings.',
            value: 0.4,
            threshold: 0.5,
            unit: 'mm',
            region: null,
            action: 'adjusted',
          }),
        ],
        events: notice('silent_review', 'queued', 'Quiet review: a minor finding, no hold.', [
          'surface.minor_stringing',
        ]),
      }),
    },
    {
      since: '2026-11-03T16:40:00Z',
      view: createStaffJobView({
        jobId: JOB.gear,
        name: 'Gear cover',
        owner: { studentId: 251100003, name: 'Tomas Reyes' },
        createdAt: '2026-11-03T16:15:00Z',
        updatedAt: '2026-11-03T16:40:00Z',
        staffStatus: 'escalated',
        studentStatus: 'preparing',
        findings: [
          createFinding({
            code: 'shell.unstable',
            component: 'checker.shell',
            severity: 'hold',
            message: 'A thin shell may crack under load.',
            value: 0.9,
            threshold: 1.2,
            unit: 'mm',
            region: { faces: [5] },
            action: 'hold',
          }),
        ],
        events: notice('escalated', 'preparing', 'Escalated for a second look.', [
          'shell.unstable',
        ]),
      }),
    },
    {
      since: '2026-11-03T17:05:00Z',
      view: createStaffJobView({
        jobId: JOB.phone,
        name: 'Phone stand',
        owner: { studentId: 251100005, name: 'Maya Patel' },
        createdAt: '2026-11-03T14:55:00Z',
        updatedAt: '2026-11-03T17:05:00Z',
        staffStatus: 'print_failed',
        studentStatus: 'printing',
        findings: [],
        events: notice('print_failed', 'printing', 'The printer stopped at layer 84.'),
      }),
    },
  ].map(({ view, since }): [string, StoredJob] => [view.jobId, { view, since }]),
);

const reports: ProblemReport[] = [
  createProblemReport({
    id: 1,
    jobId: JOB.hook,
    studentId: 251100002,
    page: `/dashboard/jobs/${JOB.hook}`,
    text: 'The hook in the preview is missing its lip. Please check it.',
    createdAt: '2026-11-03T16:10:00Z',
  }),
  createProblemReport({
    id: 2,
    jobId: JOB.bracket,
    studentId: 251100001,
    page: `/dashboard/jobs/${JOB.bracket}`,
    text: 'I thickened the walls, can someone check them again?',
    createdAt: '2026-11-03T16:25:00Z',
  }),
];

const submissions: PipelineSubmission[] = [createSubmission({ jobId: JOB.phone })];

let nextRecordId = 1;

// -- Handlers -----------------------------------------------------------------------------------

export const pipelineReviewHandlers = [
  // The queue: jobs in the staff statuses (default: the ones that need a person), then open
  // problem reports, oldest first. Counts cover every job, whatever the filter.
  http.get(`${apiUrl}${endpoints.pipelineReview.queue}`, ({ cookies, request }) => {
    const user = sessionUser(cookies);
    if (!user) return createInvalidSessionResponse();
    if (!mockUserHasPermission(user, PERMISSIONS.JOBS_UPDATE_STATUS)) return staffOnly();
    const canResolve = mockUserHasPermission(user, PERMISSIONS.JOBS_RESOLVE_ESCALATION);

    const params = new URL(request.url).searchParams;
    const statusParam = params.get('status');
    const wanted = (
      statusParam ? statusParam.split(',').map((s) => s.trim()) : DEFAULT_QUEUE_STATUSES
    ) as StaffStatus[];
    const includeReports = params.get('reports') !== 'false';
    const limit = Number(params.get('limit'));

    const openReportsFor = (jobId: string | null | undefined) =>
      reports.filter((r) => r.jobId === jobId && r.status === 'OPEN').length;

    const jobItems = [...jobs.values()]
      .filter(({ view }) => view.staffStatus != null && wanted.includes(view.staffStatus))
      .map(({ view, since }) =>
        createQueueItem({
          jobId: view.jobId,
          jobName: view.name ?? null,
          studentId: view.owner.studentId,
          studentName: view.owner.name ?? null,
          staffStatus: view.staffStatus,
          studentStatus: view.studentStatus,
          findingCodes: view.findings.map((f) => f.code),
          since,
          openReports: openReportsFor(view.jobId),
          decisions: allowedDecisionsFor(view.staffStatus, canResolve),
        }),
      );

    const reportItems = includeReports
      ? reports
          .filter((r) => r.status === 'OPEN')
          .map((r) => {
            const job = r.jobId ? jobs.get(r.jobId)?.view : undefined;
            return createReportQueueItem({
              jobId: r.jobId ?? null,
              jobName: job?.name ?? null,
              studentId: r.studentId,
              studentName: job?.owner.name ?? null,
              reportId: r.id ?? null,
              reportText: r.text,
              since: r.createdAt,
              openReports: openReportsFor(r.jobId),
            });
          })
      : [];

    const counts: Partial<Record<StaffStatus, number>> = {};
    for (const { view } of jobs.values()) {
      if (view.staffStatus) counts[view.staffStatus] = (counts[view.staffStatus] ?? 0) + 1;
    }

    const items = [...jobItems, ...reportItems].sort((a, b) => a.since.localeCompare(b.since));
    return HttpResponse.json(
      generateSuccessResponse(
        createQueueResponse({
          items: limit > 0 ? items.slice(0, limit) : items,
          counts,
          openReports: reports.filter((r) => r.status === 'OPEN').length,
          failedDecisions: [],
        }),
      ),
    );
  }),

  http.get(`${apiUrl}${endpoints.pipelineReview.job(':jobId')}`, ({ cookies, params }) => {
    const user = sessionUser(cookies);
    if (!user) return createInvalidSessionResponse();
    if (!mockUserHasPermission(user, PERMISSIONS.JOBS_UPDATE_STATUS)) return staffOnly();
    const jobId = String(params.jobId);
    const stored = jobs.get(jobId);
    if (!stored) return apiError(404, 'NOT_FOUND', 'Job not found');

    const view: StaffJobView = {
      ...stored.view,
      allowedDecisions: allowedDecisionsFor(
        stored.view.staffStatus,
        mockUserHasPermission(user, PERMISSIONS.JOBS_RESOLVE_ESCALATION),
      ),
      reports: reports.filter((r) => r.jobId === jobId),
      submission: submissions.find((s) => s.jobId === jobId) ?? null,
    };
    return HttpResponse.json(generateSuccessResponse(view));
  }),

  // A staff decision: validated like the backend, then the job moves on and the decision is
  // recorded. 202 means the pipeline has the decision (delivery SENT).
  http.post(
    `${apiUrl}${endpoints.pipelineReview.decisions(':jobId')}`,
    async ({ cookies, params, request }) => {
      const user = sessionUser(cookies);
      if (!user) return createInvalidSessionResponse();
      if (!mockUserHasPermission(user, PERMISSIONS.JOBS_UPDATE_STATUS)) return staffOnly();
      const stored = jobs.get(String(params.jobId));
      if (!stored) return apiError(404, 'NOT_FOUND', 'Job not found');

      const body = (await request.json().catch(() => null)) as Partial<StaffDecisionRequest> | null;
      const decision = body?.decision;
      if (!decision || !DECISION_ORDER.includes(decision)) {
        return apiError(400, 'VALIDATION_FAILED', 'decision is required and must be a known one');
      }
      const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';
      if (reason.length < 3 || reason.length > 1000) {
        return apiError(400, 'VALIDATION_FAILED', 'reason must be 3 to 1000 characters');
      }
      const codes = body?.codes;
      if (decision === 'release') {
        if (!Array.isArray(codes) || codes.length === 0) {
          return apiError(400, 'VALIDATION_FAILED', 'codes are required for a release');
        }
      } else if (codes !== undefined) {
        return apiError(400, 'VALIDATION_FAILED', 'codes are only allowed for a release');
      }

      const canResolve = mockUserHasPermission(user, PERMISSIONS.JOBS_RESOLVE_ESCALATION);
      if (decision === 'resolve_escalation' && !canResolve) {
        return apiError(403, 'FORBIDDEN', 'Resolving an escalation needs jobs:resolve_escalation');
      }

      const { view } = stored;
      if (!allowedDecisionsFor(view.staffStatus, canResolve).includes(decision)) {
        return apiError(
          409,
          'CONFLICT',
          `${decision} is not possible while the job is ${view.staffStatus ?? 'unknown'}`,
        );
      }

      const now = nowIso();
      const nextStaff = NEXT_STAFF_STATUS[decision];
      const nextStudent = STUDENT_STATUS_FOR[nextStaff] ?? view.studentStatus;
      const actionId = crypto.randomUUID();
      nextRecordId += 1;
      const record = createStaffDecisionRecord({
        id: nextRecordId,
        actionId,
        decision,
        codes: Array.isArray(codes) ? codes : [],
        reason,
        decidedBy: user.studentId,
        staffStatusBefore: view.staffStatus ?? null,
        delivery: 'SENT',
        deliveryError: null,
        createdAt: now,
      });
      stored.view = {
        ...view,
        staffStatus: nextStaff,
        studentStatus: nextStudent,
        updatedAt: now,
        decisions: [...view.decisions, record],
      };
      stored.since = now;

      const result: StaffDecisionResult = {
        actionId,
        decision,
        delivery: 'SENT',
        staffStatus: nextStaff,
        studentStatus: nextStudent,
      };
      return HttpResponse.json(generateSuccessResponse(result), { status: 202 });
    },
  ),

  http.get(`${apiUrl}${endpoints.pipelineReview.reports}`, ({ cookies, request }) => {
    const user = sessionUser(cookies);
    if (!user) return createInvalidSessionResponse();
    if (!mockUserHasPermission(user, PERMISSIONS.JOBS_UPDATE_STATUS)) return staffOnly();
    const status = new URL(request.url).searchParams.get('status') ?? 'OPEN';
    if (status !== 'OPEN' && status !== 'RESOLVED') {
      return apiError(400, 'VALIDATION_FAILED', 'status must be OPEN or RESOLVED');
    }
    const matching = reports
      .filter((r) => r.status === (status as ReportStatus))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return HttpResponse.json(generateSuccessResponse(matching));
  }),

  http.post(
    `${apiUrl}${endpoints.pipelineReview.reports}/:reportId/resolve`,
    async ({ cookies, params, request }) => {
      const user = sessionUser(cookies);
      if (!user) return createInvalidSessionResponse();
      if (!mockUserHasPermission(user, PERMISSIONS.JOBS_UPDATE_STATUS)) return staffOnly();
      const index = reports.findIndex((r) => r.id === Number(params.reportId));
      if (index < 0) return apiError(404, 'NOT_FOUND', 'Report not found');

      const body = (await request.json().catch(() => null)) as Partial<ResolveReportRequest> | null;
      const note = typeof body?.note === 'string' ? body.note.trim() : '';
      if (note.length < 3 || note.length > 1000) {
        return apiError(400, 'VALIDATION_FAILED', 'note must be 3 to 1000 characters');
      }
      const report = reports[index];
      if (report.status === 'RESOLVED') {
        return apiError(409, 'CONFLICT', 'Report is already resolved');
      }

      const resolved: ProblemReport = {
        ...report,
        status: 'RESOLVED',
        resolvedAt: nowIso(),
        resolvedBy: user.studentId,
        resolutionNote: note,
      };
      reports[index] = resolved;
      return HttpResponse.json(generateSuccessResponse(resolved));
    },
  ),

  http.get(`${apiUrl}${endpoints.pipelineReview.health}`, ({ cookies }) => {
    const user = sessionUser(cookies);
    if (!user) return createInvalidSessionResponse();
    if (!mockUserHasPermission(user, PERMISSIONS.JOBS_UPDATE_STATUS)) return staffOnly();
    const health: PipelineHealth = {
      status: 'ok',
      consecutiveFailures: 0,
      failingSince: null,
      lastError: null,
      lastCheckedAt: nowIso(),
      activeAlertSinks: [],
    };
    return HttpResponse.json(generateSuccessResponse(health));
  }),

  // The submission outbox: FAILED rows are jobs the pipeline did not accept (default filter).
  http.get(`${apiUrl}${endpoints.pipelineReview.submissions}`, ({ cookies, request }) => {
    const user = sessionUser(cookies);
    if (!user) return createInvalidSessionResponse();
    if (!mockUserHasPermission(user, PERMISSIONS.JOBS_UPDATE_STATUS)) return staffOnly();
    const status = new URL(request.url).searchParams.get('status') ?? 'FAILED';
    if (status !== 'PENDING' && status !== 'SENT' && status !== 'FAILED') {
      return apiError(400, 'VALIDATION_FAILED', 'status must be PENDING, SENT or FAILED');
    }
    const matching = submissions.filter((s) => s.status === (status as SubmissionStatus));
    return HttpResponse.json(generateSuccessResponse(matching));
  }),

  http.post(`${apiUrl}${endpoints.pipelineReview.requeue(':jobId')}`, ({ cookies, params }) => {
    const user = sessionUser(cookies);
    if (!user) return createInvalidSessionResponse();
    if (!mockUserHasPermission(user, PERMISSIONS.JOBS_UPDATE_STATUS)) return staffOnly();
    const jobId = String(params.jobId);
    const index = submissions.findIndex((s) => s.jobId === jobId);
    if (index < 0) return apiError(404, 'NOT_FOUND', 'No submission for this job');
    const current = submissions[index];
    if (current.status !== 'FAILED') {
      return apiError(409, 'CONFLICT', 'Only a FAILED submission can be requeued');
    }
    const requeued: PipelineSubmission = {
      ...current,
      status: 'PENDING',
      nextAttemptAt: nowIso(),
    };
    submissions[index] = requeued;
    return HttpResponse.json(generateSuccessResponse(requeued));
  }),
];
