import type {
  TrainingAuditAction,
  TrainingAuditEntry,
  TrainingAuditQuery,
} from '@/types/training-audit';

/** Plain-language names for each kind of change, as shown in the log. */
export const trainingAuditActionLabels: Record<TrainingAuditAction, string> = {
  EQUIPMENT_GROUP_CREATED: 'Equipment group added',
  EQUIPMENT_GROUP_UPDATED: 'Equipment group changed',
  EQUIPMENT_GROUP_DEACTIVATED: 'Equipment group deactivated',
  EQUIPMENT_GROUP_DELETED: 'Equipment group deleted',
  MACHINE_CREATED: 'Machine added',
  MACHINE_UPDATED: 'Machine changed',
  MACHINE_DEACTIVATED: 'Machine deactivated',
  MACHINE_DELETED: 'Machine deleted',
  TRAINING_CREATED: 'Training created',
  TRAINING_RENAMED: 'Training renamed',
  TRAINING_UPDATED: 'Training details changed',
  TRAINING_ARCHIVED: 'Training archived',
  TRAINING_UNARCHIVED: 'Training unarchived',
  TRAINING_SETTING_CHANGED: 'Training setting changed',
  DRAFT_CREATED: 'Draft started',
  DRAFT_DISCARDED: 'Draft discarded',
  STEP_ADDED: 'Step added',
  STEP_UPDATED: 'Step changed',
  STEP_DELETED: 'Step deleted',
  STEP_REORDERED: 'Steps reordered',
  BLUEPRINT_CHANGED: 'Quiz blueprint changed',
  SIGNOFF_CHECKLIST_CHANGED: 'Sign-off checklist changed',
  TOPIC_CREATED: 'Topic added',
  TOPIC_UPDATED: 'Topic changed',
  TOPIC_DELETED: 'Topic deleted',
  QUESTION_CREATED: 'Question added',
  QUESTION_UPDATED: 'Question changed',
  QUESTION_VERSION_ADDED: 'Question changed (new version)',
  QUESTION_RETIRED: 'Question retired',
  QUESTION_DELETED: 'Question deleted',
  QUESTION_RESTORED: 'Question restored',
  CORRECTION_RECORDED: 'Correction recorded',
  TRAINING_PUBLISHED: 'Version published',
  TRAINING_IMPORTED: 'File imported',
  SIGNOFF_APPROVED: 'Sign-off approved',
  SIGNOFF_REJECTED: 'Sign-off not approved',
  VIDEO_UPLOAD_REQUESTED: 'Video upload requested',
};

/** Who made the change, in words. The supervisor is named for a Teams approval, since they are the one who approved. */
export function auditActorLabel(entry: TrainingAuditEntry): string {
  const name = entry.actor
    ? [entry.actor.firstName, entry.actor.lastName].filter(Boolean).join(' ') ||
      `Student ${entry.actor.studentId}`
    : null;
  switch (entry.actorType) {
    case 'SYSTEM':
      return 'Automatic (nobody signed in)';
    case 'INTEGRATION':
      return name ? `${name} (through Teams)` : 'Teams';
    default:
      return name ?? 'Unknown person';
  }
}

/** When the change was made, in this browser's local time. */
export function formatAuditWhen(iso: string): string {
  return new Date(iso).toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' });
}

/** The start of a local calendar day (`YYYY-MM-DD`) as an ISO instant, or undefined if it is not a full date. */
export function startOfLocalDay(day: string): string | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) return undefined;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

/** The start of the day after a local calendar day: the exclusive end of a range that includes that day. */
export function startOfNextLocalDay(day: string): string | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) return undefined;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + 1);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

/** The filters as the form holds them (strings), before they become a query. */
export interface AuditFilters {
  trainingId: string;
  action: string;
  actorId: string;
  from: string;
  to: string;
}

export const EMPTY_AUDIT_FILTERS: AuditFilters = {
  trainingId: '',
  action: '',
  actorId: '',
  from: '',
  to: '',
};

export const AUDIT_PAGE_SIZE = 50;

/** Turns the form's filters into the query the API takes. Anything half-typed is left out rather than sent wrong. */
export function auditQueryFromFilters(
  filters: AuditFilters,
): Omit<TrainingAuditQuery, 'page' | 'snapshotCreatedBefore'> {
  const trainingId = Number(filters.trainingId);
  const actorId = filters.actorId.trim();
  return {
    trainingId: filters.trainingId && Number.isInteger(trainingId) ? trainingId : undefined,
    action: filters.action ? (filters.action as TrainingAuditAction) : undefined,
    actorId: /^\d+$/.test(actorId) ? Number(actorId) : undefined,
    from: startOfLocalDay(filters.from),
    to: startOfNextLocalDay(filters.to),
    pageSize: AUDIT_PAGE_SIZE,
  };
}
