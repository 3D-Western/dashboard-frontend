// What staff see of the print pipeline: the dashboard backend's staff review API
// (dashboard-backend entities/pipeline/staff/StaffModels.kt, PipelineAdminController.kt and
// slicing-pipeline/docs/design/dashboard-contract.md, "Staff decisions"). Staff only: these
// shapes carry staff statuses, findings with evidence and the student's own words, and are never
// shown on a student page. Field names are the backend's camelCase JSON; enum values are the wire
// strings (staff statuses and decisions in snake_case, delivery and report states in capitals).

import type {
  Answer,
  Choice,
  LessonCard,
  PlanArtifact,
  Region,
  Severity,
  StudentInputs,
  StudentSettings,
  StudentStatus,
} from './pipeline';

export type StaffStatus =
  | 'analysing'
  | 'awaiting_student'
  | 'silent_review'
  | 'escalated'
  | 'held'
  | 'cannot_print'
  | 'queued'
  | 'dispatched'
  | 'printing'
  | 'print_failed'
  | 'reprinting'
  | 'ejected'
  | 'ready_for_pickup'
  | 'collected'
  | 'not_collected'
  | 'rejected'
  | 'cancelled'
  | 'expired';

export type StaffDecisionType =
  | 'release'
  | 'approve'
  | 'reject'
  | 'escalate'
  | 'resolve_escalation'
  | 'rerun'
  | 'cancel';

/** SENT (the pipeline took it), QUEUED (waits for the pipeline), REFUSED, or FAILED (gave up). */
export type DecisionDelivery = 'SENT' | 'QUEUED' | 'REFUSED' | 'FAILED';

export type ReportStatus = 'OPEN' | 'RESOLVED';

export type SubmissionStatus = 'PENDING' | 'SENT' | 'FAILED';

// -- Queue ------------------------------------------------------------------------------------

export type QueueItemKind = 'Job' | 'Report';

/** One line of the queue: a job in a staff status that needs a person, or an open report. */
export interface QueueItem {
  kind: QueueItemKind;
  jobId?: string | null;
  jobName?: string | null;
  studentId?: number | null;
  studentName?: string | null;
  staffStatus?: StaffStatus | null;
  studentStatus?: StudentStatus | null;
  /** Codes of the findings behind the status. */
  findingCodes?: string[];
  /** When the job entered the status, or the report was sent. */
  since: string;
  openReports?: number;
  reportId?: number | null;
  reportText?: string | null;
  decisions?: StaffDecisionType[];
}

/** A staff decision the outbox gave up delivering: the pipeline never got it. */
export interface FailedDecision {
  jobId: string;
  actionId: string;
  decision?: string | null;
  error?: string | null;
  createdAt: string;
}

/** GET /api/v1/admin/pipeline/review/queue */
export interface QueueResponse {
  items: QueueItem[];
  /** Jobs per staff status, whatever the filter. */
  counts: Partial<Record<StaffStatus, number>>;
  openReports: number;
  failedDecisions?: FailedDecision[];
}

export interface QueueQuery {
  /** Staff statuses to list; the backend's default set is used when empty. */
  status?: StaffStatus[];
  /** false leaves the problem reports out. */
  reports?: boolean;
  limit?: number;
}

// -- Job view ---------------------------------------------------------------------------------

export interface StaffOwner {
  studentId?: number | null;
  name?: string | null;
}

/** A plan as staff see it: nothing is dropped; artifacts are short-lived links. */
export interface StaffPlan {
  planId: string;
  answer: Answer;
  summary: string;
  printTimeS?: number | null;
  filamentG?: number | null;
  settingsChosen?: StudentSettings;
  settingsReasons?: Record<string, string>;
  lessonCards: LessonCard[];
  choices: Choice[];
  artifacts: PlanArtifact[];
}

export interface StaffPickup {
  slot: string;
  tag: string;
  windowEndsAt: string;
}

/** One finding with its evidence (the pipeline's `Finding`). `data` keys are the pipeline's own. */
export interface Finding {
  code: string;
  component: string;
  componentVersion?: string;
  severity: Severity;
  message: string;
  value?: unknown;
  threshold?: unknown;
  unit?: string | null;
  likelihoodDefect?: number | null;
  likelihoodFailure?: number | null;
  region?: Region | null;
  action?: string | null;
  data?: Record<string, unknown>;
}

export type PipelineEventType = 'status' | 'step' | 'plan' | 'farm' | 'pickup' | 'notice';

export interface StaffEvent {
  seq: number;
  type: PipelineEventType;
  occurredAt: string;
  staffStatus: StaffStatus;
  studentStatus: StudentStatus;
  /** False for events the student was never told about. */
  studentVisible: boolean;
  stepTitle?: string | null;
  planId?: string | null;
  message?: string | null;
  findingCodes: string[];
  data: Record<string, unknown>;
}

export interface StaffDecisionRecord {
  id?: number | null;
  actionId: string;
  decision: string;
  codes: string[];
  reason: string;
  /** Null once the staff member's account is gone. */
  decidedBy: number | null;
  staffStatusBefore?: string | null;
  delivery: DecisionDelivery;
  /** Why a FAILED or still-queued delivery has not gone through. */
  deliveryError?: string | null;
  createdAt: string;
}

export interface ProblemReport {
  id?: number | null;
  jobId?: string | null;
  studentId: number;
  page?: string | null;
  text: string;
  status: ReportStatus;
  createdAt: string;
  resolvedAt?: string | null;
  resolvedBy?: number | null;
  resolutionNote?: string | null;
}

/** The SubmitJob outbox row (GET /api/v1/admin/pipeline/submissions). */
export interface PipelineSubmission {
  jobId: string;
  status: SubmissionStatus;
  attempts: number;
  lastError?: string | null;
  nextAttemptAt: string;
  createdAt: string;
  sentAt?: string | null;
}

/**
 * A render of the part made for screening review (never shown to students): `url` is a
 * short-lived download link, the storage key stays on the server.
 */
export interface StaffRender {
  kind: string;
  /** Which view of the part it is, e.g. "front" or "iso". */
  view?: string | null;
  url: string;
}

/** One exchange of a student's conversation with the "Ask why" assistant, as the pipeline recorded it. */
export interface StaffDisagreeTurn {
  turn?: number | null;
  askedAt?: string | null;
  question: string;
  /** How the assistant answered: answered, not_in_record, declined, unavailable ... */
  status?: string | null;
  answer?: string | null;
  /** Record entries the answer used: `card:<finding code>`, `summary`, `numbers` ... */
  cited?: string[];
  /** Local injection rules the question matched (the assistant declined it without a model call). */
  injectionRules?: string[];
}

/** A student's "Ask the crew" after the assistant (P-54). Staff only: the student's own words. */
export interface StudentDisagreement {
  eventSeq: number;
  occurredAt: string;
  escalationId?: string | null;
  /** What the student wrote when asking the crew; absent when they just clicked. */
  studentReason?: string | null;
  citedFindingCodes?: string[];
  /** A question looked like an attempt to manipulate the assistant. */
  suspectedInjection?: boolean;
  conversation?: StaffDisagreeTurn[];
  note?: string | null;
}

/** GET /api/v1/admin/pipeline/review/jobs/{id} */
export interface StaffJobView {
  jobId: string;
  name?: string | null;
  owner: StaffOwner;
  createdAt: string;
  updatedAt: string;
  staffStatus?: StaffStatus | null;
  studentStatus?: StudentStatus | null;
  /** The job's own description from upload time (legacy form). */
  description?: string | null;
  /** What the student typed in the pipeline form. */
  inputs?: StudentInputs | null;
  inputsUpdatedAt?: string | null;
  plan?: StaffPlan | null;
  pickup?: StaffPickup | null;
  /** Findings of the latest event that carried any. */
  findings: Finding[];
  findingsSeq?: number | null;
  events: StaffEvent[];
  decisions: StaffDecisionRecord[];
  reports: ProblemReport[];
  submission?: PipelineSubmission | null;
  /** The decisions that make sense from the current status (resolve_escalation only for those who may). */
  allowedDecisions: StaffDecisionType[];
  /** Renders of the part for the screening review (latest hold that had any), as short-lived links. */
  screeningRenders?: StaffRender[];
  /** Students who asked the crew after the "Ask why" assistant, oldest first. Staff only. */
  studentDisagreements?: StudentDisagreement[];
  /**
   * True while the job is on a printer and a live view is on (P-100): staff may watch any print.
   * A hint; the live view endpoint has the last word.
   */
  liveView?: boolean | null;
}

// -- Decisions --------------------------------------------------------------------------------

/** POST .../jobs/{id}/decisions body (StaffDecisionRequest). */
export interface StaffDecisionRequest {
  decision: StaffDecisionType;
  /** Always required, 3 to 1000 characters. */
  reason: string;
  /** Finding codes a `release` covers: required for `release`, not allowed for the others. */
  codes?: string[];
}

/** 202 answer (StaffDecisionResult). */
export interface StaffDecisionResult {
  actionId: string;
  decision: StaffDecisionType;
  delivery: DecisionDelivery;
  staffStatus?: StaffStatus | null;
  studentStatus?: StudentStatus | null;
}

/** POST .../reports/{id}/resolve body (ResolveReportRequest). */
export interface ResolveReportRequest {
  /** 3 to 1000 characters. */
  note: string;
}

/** GET .../health */
export interface PipelineHealth {
  status: 'ok' | 'degraded' | 'down';
  consecutiveFailures: number;
  failingSince?: string | null;
  lastError?: string | null;
  lastCheckedAt?: string | null;
  activeAlertSinks: string[];
}
