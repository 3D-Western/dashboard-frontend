/** Every kind of change the training audit log records (backend `TrainingAuditAction`). */
export type TrainingAuditAction =
  | 'EQUIPMENT_GROUP_CREATED'
  | 'EQUIPMENT_GROUP_UPDATED'
  | 'EQUIPMENT_GROUP_DEACTIVATED'
  | 'EQUIPMENT_GROUP_DELETED'
  | 'MACHINE_CREATED'
  | 'MACHINE_UPDATED'
  | 'MACHINE_DEACTIVATED'
  | 'MACHINE_DELETED'
  | 'TRAINING_CREATED'
  | 'TRAINING_RENAMED'
  | 'TRAINING_UPDATED'
  | 'TRAINING_ARCHIVED'
  | 'TRAINING_UNARCHIVED'
  | 'TRAINING_SETTING_CHANGED'
  | 'DRAFT_CREATED'
  | 'DRAFT_DISCARDED'
  | 'STEP_ADDED'
  | 'STEP_UPDATED'
  | 'STEP_DELETED'
  | 'STEP_REORDERED'
  | 'BLUEPRINT_CHANGED'
  | 'SIGNOFF_CHECKLIST_CHANGED'
  | 'TOPIC_CREATED'
  | 'TOPIC_UPDATED'
  | 'TOPIC_DELETED'
  | 'QUESTION_CREATED'
  | 'QUESTION_UPDATED'
  | 'QUESTION_VERSION_ADDED'
  | 'QUESTION_RETIRED'
  | 'QUESTION_DELETED'
  | 'QUESTION_RESTORED'
  | 'CORRECTION_RECORDED'
  | 'TRAINING_PUBLISHED'
  | 'TRAINING_IMPORTED'
  | 'SIGNOFF_APPROVED'
  | 'SIGNOFF_REJECTED'
  | 'VIDEO_UPLOAD_REQUESTED';

export type TrainingAuditEntityType =
  | 'EQUIPMENT_GROUP'
  | 'MACHINE'
  | 'TRAINING'
  | 'TRAINING_VERSION'
  | 'TRAINING_STEP'
  | 'QUESTION_TOPIC'
  | 'QUESTION'
  | 'QUESTION_VERSION'
  | 'SIGNOFF_REQUEST'
  | 'VIDEO_UPLOAD';

/** One row of the audit log. `actor` is null only for SYSTEM entries. `details` holds the before and after values. */
export interface TrainingAuditEntry {
  id: number;
  createdAt: string;
  actor: { studentId: number; firstName: string | null; lastName: string | null } | null;
  actorType: 'USER' | 'STAFF' | 'SYSTEM' | 'INTEGRATION';
  action: TrainingAuditAction;
  entityType: TrainingAuditEntityType;
  entityId: string;
  trainingId: number | null;
  summary: string;
  details: unknown;
}

/** Query for `GET /api/v1/admin/training/audit-log`. `from` is inclusive, `to` exclusive (ISO instants). */
export interface TrainingAuditQuery {
  trainingId?: number;
  actorId?: number;
  action?: TrainingAuditAction;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
  snapshotCreatedBefore?: string;
}
