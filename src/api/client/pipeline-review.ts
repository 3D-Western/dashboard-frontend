import type {
  PipelineHealth,
  PipelineSubmission,
  ProblemReport,
  QueueQuery,
  QueueResponse,
  ReportStatus,
  ResolveReportRequest,
  StaffDecisionRequest,
  StaffDecisionResult,
  StaffJobView,
  SubmissionStatus,
} from '@/types/pipeline-review';
import { apiRequest } from './base';
import { endpoints } from './endpoints';
import { getBaseUrl } from './utils';

/**
 * The staff side of the print pipeline: the review queue, a job's full view, decisions, problem
 * reports and the submission outbox. Every endpoint needs `jobs:update_status` (any scope);
 * `resolve_escalation` also needs `jobs:resolve_escalation`. Staff pages only.
 */

const request = <T>(path: string, init: RequestInit = {}) =>
  apiRequest<T>(`${getBaseUrl()}${path}`, { credentials: 'include', ...init });

const get = <T>(path: string, options?: RequestInit) =>
  request<T>(path, { method: 'GET', ...options });

const post = <T>(path: string, body?: unknown, options: RequestInit = {}) =>
  request<T>(path, {
    method: 'POST',
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    ...options,
  });

/** `?status=a,b&reports=false&limit=n`; nothing is sent for a default. */
export function queueUrl(query: QueueQuery = {}): string {
  const params = new URLSearchParams();
  if (query.status && query.status.length > 0) params.set('status', query.status.join(','));
  if (query.reports === false) params.set('reports', 'false');
  if (query.limit !== undefined) params.set('limit', String(query.limit));
  const qs = params.toString();
  return `${endpoints.pipelineReview.queue}${qs ? `?${qs}` : ''}`;
}

export const pipelineReviewApi = {
  /** Jobs in the given staff statuses plus open problem reports, oldest first, with counts. */
  queue: (query: QueueQuery = {}, options?: RequestInit) =>
    get<QueueResponse>(queueUrl(query), options),

  /** Everything staff need to decide about one job. */
  job: (jobId: string, options?: RequestInit) =>
    get<StaffJobView>(endpoints.pipelineReview.job(jobId), options),

  /**
   * Send a staff decision (202). The backend needs a reason for every decision, `codes` for a
   * release, and answers 409 when the decision is not possible in the job's status. The
   * idempotency key makes a retry after a network error safe: the same key is never applied twice.
   */
  decide: (
    jobId: string,
    decision: StaffDecisionRequest,
    idempotencyKey: string = crypto.randomUUID(),
  ) =>
    post<StaffDecisionResult>(endpoints.pipelineReview.decisions(jobId), decision, {
      headers: { 'Idempotency-Key': idempotencyKey },
    }),

  /** Problem reports, oldest first (default OPEN). */
  reports: (status: ReportStatus = 'OPEN', options?: RequestInit) =>
    get<ProblemReport[]>(
      `${endpoints.pipelineReview.reports}?status=${encodeURIComponent(status)}`,
      options,
    ),

  resolveReport: (reportId: number, body: ResolveReportRequest) =>
    post<ProblemReport>(endpoints.pipelineReview.resolveReport(reportId), body),

  /** The backend's view of the slicing pipeline: ok, degraded or down. */
  health: (options?: RequestInit) => get<PipelineHealth>(endpoints.pipelineReview.health, options),

  /** SubmitJob outbox rows by status; FAILED are jobs the pipeline did not accept. */
  submissions: (status: SubmissionStatus = 'FAILED', options?: RequestInit) =>
    get<PipelineSubmission[]>(
      `${endpoints.pipelineReview.submissions}?status=${encodeURIComponent(status)}`,
      options,
    ),

  /** Puts a FAILED submission back in the queue and tries it at once (404 none, 409 not FAILED). */
  requeue: (jobId: string) => post<PipelineSubmission>(endpoints.pipelineReview.requeue(jobId)),
};
