import type {
  Finding,
  PipelineSubmission,
  ProblemReport,
  QueueItem,
  QueueResponse,
  StaffDecisionRecord,
  StaffEvent,
  StaffJobView,
} from '@/types/pipeline-review';
import type { User } from '@/types/user';
import { createMockUser } from './mockFactories';

export const HELD_JOB_ID = '11111111-1111-4111-8111-000000000001';

export function createFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    code: 'walls.too_thin',
    component: 'checker.walls',
    componentVersion: '1.4.0',
    severity: 'hold',
    message: 'Some walls are 0.6 mm thick; the printers need at least 0.8 mm.',
    value: 0.6,
    threshold: 0.8,
    unit: 'mm',
    likelihoodDefect: 0.7,
    likelihoodFailure: 0.4,
    region: { bboxMm: [10, 0, 2, 14, 8, 9] },
    action: 'hold',
    data: {},
    ...overrides,
  };
}

export function createStaffEvent(overrides: Partial<StaffEvent> = {}): StaffEvent {
  return {
    seq: 1,
    type: 'status',
    occurredAt: '2026-11-03T13:58:00Z',
    staffStatus: 'analysing',
    studentStatus: 'preparing',
    studentVisible: true,
    stepTitle: null,
    planId: null,
    message: null,
    findingCodes: [],
    data: {},
    ...overrides,
  };
}

export function createStaffDecisionRecord(
  overrides: Partial<StaffDecisionRecord> = {},
): StaffDecisionRecord {
  return {
    id: 1,
    actionId: '5f3c2a10-9b7e-4d2a-8c11-2e6f0a9d4b01',
    decision: 'release',
    codes: ['walls.too_thin'],
    reason: 'Checked the walls by hand; they are thick enough once printed.',
    decidedBy: 251000001,
    staffStatusBefore: 'held',
    delivery: 'SENT',
    deliveryError: null,
    createdAt: '2026-11-03T14:20:00Z',
    ...overrides,
  };
}

export function createProblemReport(overrides: Partial<ProblemReport> = {}): ProblemReport {
  return {
    id: 1,
    jobId: HELD_JOB_ID,
    studentId: 251100001,
    page: '/dashboard/jobs/11111111-1111-4111-8111-000000000001',
    text: 'My part looks fine on screen. Can someone check the thin walls?',
    status: 'OPEN',
    createdAt: '2026-11-03T16:10:00Z',
    resolvedAt: null,
    resolvedBy: null,
    resolutionNote: null,
    ...overrides,
  };
}

export function createSubmission(overrides: Partial<PipelineSubmission> = {}): PipelineSubmission {
  return {
    jobId: '11111111-1111-4111-8111-000000000005',
    status: 'FAILED',
    attempts: 5,
    lastError: 'Pipeline rejected the job: slice profile is missing.',
    nextAttemptAt: '2026-11-03T18:00:00Z',
    createdAt: '2026-11-03T15:00:00Z',
    sentAt: null,
    ...overrides,
  };
}

/** A realistic held job: two findings with evidence, a plan, three events, an owner and inputs. */
export function createStaffJobView(overrides: Partial<StaffJobView> = {}): StaffJobView {
  return {
    jobId: HELD_JOB_ID,
    name: 'Bracket v3',
    owner: { studentId: 251100001, name: 'Sam Ortiz' },
    createdAt: '2026-11-03T13:50:00Z',
    updatedAt: '2026-11-03T14:00:00Z',
    staffStatus: 'held',
    studentStatus: 'preparing',
    description: null,
    inputs: {
      purpose: 'class',
      purposeDetails: { course: 'MECH 2100' },
      description: 'A bracket that holds a shelf to the bench.',
      settings: {
        profile: 'standard',
        infillPercent: 25,
        supports: 'auto',
        supportsBuildPlateOnly: true,
        brim: 'auto',
      },
    },
    inputsUpdatedAt: '2026-11-03T13:52:00Z',
    plan: {
      planId: 'plan-held-1',
      answer: 'held',
      summary: 'The walls are too thin in 3 places and an arm needs supports we cannot trust.',
      printTimeS: null,
      filamentG: null,
      settingsChosen: {
        profile: 'standard',
        infillPercent: 25,
        supports: 'auto',
        supportsBuildPlateOnly: true,
        brim: 'on',
      },
      settingsReasons: {
        profile: 'Standard balances speed and a smooth surface for a part like this.',
      },
      lessonCards: [],
      choices: [],
      artifacts: [{ kind: 'preview_png', url: '/preview.png' }],
    },
    pickup: null,
    findings: [
      createFinding(),
      createFinding({
        code: 'overhang.unsupported',
        component: 'checker.overhangs',
        severity: 'hold',
        message: 'The arm overhangs at 58 degrees; supports would not hold it.',
        value: 58,
        threshold: 45,
        unit: 'deg',
        likelihoodDefect: 0.5,
        likelihoodFailure: 0.6,
        region: { faces: [2, 3] },
      }),
    ],
    findingsSeq: 2,
    events: [
      createStaffEvent({ seq: 1, staffStatus: 'analysing', studentStatus: 'preparing' }),
      createStaffEvent({
        seq: 2,
        type: 'step',
        occurredAt: '2026-11-03T13:59:00Z',
        stepTitle: 'Measuring your part',
        message: 'Measured the walls and overhangs.',
      }),
      createStaffEvent({
        seq: 3,
        type: 'notice',
        occurredAt: '2026-11-03T14:00:00Z',
        staffStatus: 'held',
        studentVisible: false,
        message: 'Held for review: thin walls and an unsupported overhang.',
        findingCodes: ['walls.too_thin', 'overhang.unsupported'],
      }),
    ],
    decisions: [],
    reports: [],
    submission: null,
    allowedDecisions: ['release', 'approve', 'reject', 'escalate', 'rerun', 'cancel'],
    ...overrides,
  };
}

/** One Job line of the review queue (a job in a staff status that needs a person). */
export function createQueueItem(overrides: Partial<QueueItem> = {}): QueueItem {
  return {
    kind: 'Job',
    jobId: HELD_JOB_ID,
    jobName: 'Bracket v3',
    studentId: 251100001,
    studentName: 'Sam Ortiz',
    staffStatus: 'held',
    studentStatus: 'preparing',
    findingCodes: ['walls.too_thin', 'overhang.unsupported'],
    since: '2026-11-03T14:00:00Z',
    openReports: 0,
    decisions: ['release', 'approve', 'reject', 'escalate', 'rerun', 'cancel'],
    ...overrides,
  };
}

/** One Report line of the review queue (an open problem report from a student). */
export function createReportQueueItem(overrides: Partial<QueueItem> = {}): QueueItem {
  return {
    kind: 'Report',
    jobId: HELD_JOB_ID,
    jobName: 'Bracket v3',
    studentId: 251100001,
    studentName: 'Sam Ortiz',
    reportId: 1,
    reportText: 'My part looks fine on screen. Can someone check the thin walls?',
    since: '2026-11-03T16:10:00Z',
    openReports: 1,
    ...overrides,
  };
}

export function createQueueResponse(overrides: Partial<QueueResponse> = {}): QueueResponse {
  return {
    items: [createQueueItem()],
    counts: { held: 1 },
    openReports: 1,
    failedDecisions: [],
    ...overrides,
  };
}

/** A staff user: a mock user holding the given permission keys, for any scope. */
export function createStaffUser(permissions: string[] = ['jobs:update_status']): User {
  return createMockUser({
    permissions: permissions.map((key) => ({ key, scopeKey: 'any' })),
  });
}
