// The logic of the staff review page that needs no DOM: who may do what, what a decision must
// carry (mirrors the backend's StaffDecisionRequest rules), labels, and reading the evidence out
// of a job view. Staff only; nothing here is meant for a student page.

import { PERMISSIONS } from '@/constants/permissions';
import { hasPermissionWithScope, type User } from '@/types/user';
import type { LessonCard } from '@/types/pipeline';
import type {
  Finding,
  QueueItem,
  StaffDecisionRequest,
  StaffDecisionType,
  StaffEvent,
  StaffRender,
  StaffStatus,
} from '@/types/pipeline-review';

// -- Permissions ------------------------------------------------------------------------------

/** The review pages and every endpoint behind them: `jobs:update_status`, any scope. */
export const canReviewPrints = (user: User | null | undefined) =>
  hasPermissionWithScope(user, PERMISSIONS.JOBS_UPDATE_STATUS, 'any');

/** Resolving an escalation (possibly illegal content) needs its own permission on top. */
export const canResolveEscalation = (user: User | null | undefined) =>
  canReviewPrints(user) && hasPermissionWithScope(user, PERMISSIONS.JOBS_RESOLVE_ESCALATION, 'any');

/**
 * The decisions to offer: what the backend says is possible from the job's status, minus
 * `resolve_escalation` unless this user holds the elevated permission (the backend refuses it
 * either way; the button just never appears).
 */
export function decisionsFor(
  allowed: readonly StaffDecisionType[] | undefined,
  user: User | null | undefined,
): StaffDecisionType[] {
  if (!canReviewPrints(user)) return [];
  return (allowed ?? []).filter((d) => d !== 'resolve_escalation' || canResolveEscalation(user));
}

// -- Decisions --------------------------------------------------------------------------------

export const REASON_MIN = 3;
export const REASON_MAX = 1000;

export const DECISION_LABEL: Record<StaffDecisionType, string> = {
  release: 'Release holds',
  approve: 'Approve',
  reject: 'Reject',
  escalate: 'Escalate',
  resolve_escalation: 'Resolve escalation',
  rerun: 'Run again',
  cancel: 'Cancel job',
};

export const DECISION_HELP: Record<StaffDecisionType, string> = {
  release: 'Let the pipeline carry on with the holds you pick covered by your decision.',
  approve: 'Reviewed and fine: release every releasable hold of the latest check.',
  reject: 'The student is told this cannot be printed.',
  escalate: 'Hand this job to a more senior reviewer.',
  resolve_escalation:
    'The escalation was a false positive. Sends the job back to normal processing. Needs the elevated permission.',
  rerun: 'Run the analysis again.',
  cancel: 'Cancel the job. The student is told it was cancelled.',
};

/** Order in which decision buttons appear: the positive outcomes first, the final ones last. */
export const DECISION_ORDER: StaffDecisionType[] = [
  'approve',
  'release',
  'rerun',
  'resolve_escalation',
  'escalate',
  'reject',
  'cancel',
];

/** Decisions that cannot be taken back lightly: staff confirm them in a second step. */
const CONFIRMED: ReadonlySet<StaffDecisionType> = new Set([
  'reject',
  'escalate',
  'cancel',
  'resolve_escalation',
]);

export const needsConfirmation = (decision: StaffDecisionType) => CONFIRMED.has(decision);

export const sortDecisions = (decisions: readonly StaffDecisionType[]) =>
  [...decisions].sort((a, b) => DECISION_ORDER.indexOf(a) - DECISION_ORDER.indexOf(b));

export interface DecisionDraft {
  decision: StaffDecisionType;
  reason: string;
  codes: string[];
}

export interface DecisionErrors {
  reason?: string;
  codes?: string;
}

/** The backend's own rules, checked before anything is sent. Empty object means valid. */
export function validateDecision(draft: DecisionDraft): DecisionErrors {
  const errors: DecisionErrors = {};
  const reason = draft.reason.trim();
  if (reason.length === 0) errors.reason = 'A reason is required.';
  else if (reason.length < REASON_MIN)
    errors.reason = `The reason must be at least ${REASON_MIN} characters.`;
  else if (reason.length > REASON_MAX)
    errors.reason = `The reason can be at most ${REASON_MAX} characters.`;
  if (draft.decision === 'release' && draft.codes.length === 0) {
    errors.codes = 'Pick at least one finding to release.';
  }
  return errors;
}

/** The exact body of POST .../decisions: `codes` only for a release, the reason trimmed. */
export function buildDecisionRequest(draft: DecisionDraft): StaffDecisionRequest {
  const body: StaffDecisionRequest = { decision: draft.decision, reason: draft.reason.trim() };
  if (draft.decision === 'release') body.codes = [...draft.codes];
  return body;
}

// -- Statuses ---------------------------------------------------------------------------------

export const STAFF_STATUS_LABEL: Record<StaffStatus, string> = {
  analysing: 'Analysing',
  awaiting_student: 'Waiting for student',
  silent_review: 'Silent review',
  escalated: 'Escalated',
  held: 'Held',
  cannot_print: 'Cannot print',
  queued: 'Queued',
  dispatched: 'Dispatched',
  printing: 'Printing',
  print_failed: 'Print failed',
  reprinting: 'Reprinting',
  ejected: 'Ejected',
  ready_for_pickup: 'Ready for pickup',
  collected: 'Collected',
  not_collected: 'Not collected',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

/** Statuses where staff have something to do: the backend's default queue. */
export const QUEUE_STATUSES: StaffStatus[] = [
  'held',
  'silent_review',
  'escalated',
  'cannot_print',
  'print_failed',
];

export type StatusTone = 'danger' | 'warning' | 'neutral' | 'success';

export function statusTone(status: StaffStatus | null | undefined): StatusTone {
  switch (status) {
    case 'escalated':
    case 'print_failed':
    case 'cannot_print':
    case 'rejected':
      return 'danger';
    case 'held':
    case 'silent_review':
    case 'awaiting_student':
      return 'warning';
    case 'ready_for_pickup':
    case 'collected':
      return 'success';
    default:
      return 'neutral';
  }
}

export const staffStatusLabel = (status: StaffStatus | null | undefined) =>
  status ? (STAFF_STATUS_LABEL[status] ?? status.replaceAll('_', ' ')) : 'Unknown';

// -- Queue ------------------------------------------------------------------------------------

/** Oldest first, as the backend sends it; sorted again here so a stale cache never reorders. */
export const oldestFirst = (items: readonly QueueItem[]): QueueItem[] =>
  [...items].sort((a, b) => new Date(a.since).getTime() - new Date(b.since).getTime());

export type QueueFilter = StaffStatus | 'reports';

/** Applies the status chips on the client (the backend is asked for the same set). */
export function filterQueue(items: readonly QueueItem[], active: readonly QueueFilter[]) {
  if (active.length === 0) return oldestFirst(items);
  return oldestFirst(
    items.filter((item) =>
      item.kind === 'Report'
        ? active.includes('reports')
        : item.staffStatus != null && active.includes(item.staffStatus),
    ),
  );
}

/** The jobs-only statuses of a filter, for the `status` parameter. */
export const statusesOf = (active: readonly QueueFilter[]): StaffStatus[] =>
  active.filter((f): f is StaffStatus => f !== 'reports');

// -- Evidence ---------------------------------------------------------------------------------

/** "12.5 mm", "0.4", "on"; evidence values can be numbers, text, lists or small objects. */
export function formatEvidence(value: unknown, unit?: string | null): string {
  if (value === null || value === undefined) return 'n/a';
  let text: string;
  if (typeof value === 'number')
    text = Number.isInteger(value) ? String(value) : String(+value.toFixed(3));
  else if (typeof value === 'string') text = value;
  else if (typeof value === 'boolean') text = value ? 'yes' : 'no';
  else text = JSON.stringify(value);
  return unit ? `${text} ${unit}` : text;
}

export function formatRegion(region: Finding['region']): string | null {
  if (!region) return null;
  const parts: string[] = [];
  if (region.bboxMm) parts.push(`box ${region.bboxMm.map((n) => +n.toFixed(1)).join(', ')} mm`);
  if (region.faces?.length) parts.push(`${region.faces.length} faces`);
  if (region.layers) parts.push(`layers ${region.layers[0]} to ${region.layers[1]}`);
  return parts.length > 0 ? parts.join('; ') : null;
}

/** "3 h 25 min" for a print time in seconds. */
export function formatPrintTime(seconds: number | null | undefined): string | null {
  if (seconds == null) return null;
  const minutes = Math.round(seconds / 60);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

/** Findings that are holds: the ones a `release` can name. */
export function releasableFindings(findings: readonly Finding[]): Finding[] {
  const holds = findings.filter((f) => f.severity === 'hold');
  return holds.length > 0 ? holds : [...findings];
}

/** The findings that have a region, as cards the 3D viewer can highlight (it keys on `code`). */
export function findingsAsCards(findings: readonly Finding[]): LessonCard[] {
  return findings
    .filter((f) => f.region && (f.region.faces?.length || f.region.bboxMm || f.region.layers))
    .map((f) => ({
      code: f.code,
      title: f.message,
      body: f.message,
      severity: f.severity,
      region: f.region,
      consequential: f.severity !== 'info',
    }));
}

export interface ScreeningRender {
  name: string;
  /** The short-lived link the backend issued. */
  url: string;
}

/**
 * The renders the screening step stored for staff, as the backend serves them in the job view's
 * `screeningRenders` (`{ kind, view?, url }`, one link each). A render without a `view` is named
 * by its place in the list.
 */
export function screeningRendersOf(
  renders: readonly StaffRender[] | null | undefined,
): ScreeningRender[] {
  return (renders ?? [])
    .filter((render) => (render.kind ?? 'screening_png') === 'screening_png' && render.url)
    .map((render, index) => ({ name: render.view || `render ${index + 1}`, url: render.url }));
}

/** The first eight characters of an id, enough to tell jobs apart in a list. */
export const shortId = (id: string) => id.slice(0, 8);

/** The finding codes behind a queue line: the first few, then how many more. */
export const shortCodes = (codes: readonly string[] | undefined, max = 3) => {
  const list = codes ?? [];
  return list.length <= max
    ? list.join(', ')
    : `${list.slice(0, max).join(', ')} +${list.length - max}`;
};
