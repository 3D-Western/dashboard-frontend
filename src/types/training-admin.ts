// ---------------------------------------------------------------------------------------------
// Admin training API (/api/v1/admin/training). Shapes follow the "Authoring API" section of
// docs/plans/training-v1.md and the backend's TrainingDtos.kt.
// ---------------------------------------------------------------------------------------------

import type { QuestionType, StepType, TrainingKind } from '@/types/training';

export type { StepType, TrainingKind };

export type AdminQuestionType = Exclude<QuestionType, 'HOTSPOT'>;
export type LapsedPolicy = 'QUIZ' | 'QUIZ_AND_SIGNOFF';
export type VersionStatus = 'DRAFT' | 'PUBLISHED' | 'RETIRED';
export type PublishImpact = 'MINOR' | 'ADDON' | 'FULL_RETAKE';
export type CorrectionKind = 'ACCEPT_OPTION' | 'DROP_QUESTION';

// ---- Equipment ----

export interface EquipmentGroup {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  active: boolean;
  machineCount: number;
}

export interface EquipmentGroupBody {
  slug: string;
  name: string;
  description?: string | null;
  active?: boolean;
}

export interface Machine {
  id: number;
  slug: string;
  name: string;
  equipmentGroupId: number;
  equipmentGroupSlug: string;
  location: string | null;
  active: boolean;
}

export interface MachineBody {
  slug: string;
  name: string;
  equipmentGroupId: number;
  location?: string | null;
  active?: boolean;
}

// ---- Trainings and settings ----

export interface TrainingSettings {
  passMarkPercent: number;
  attemptLimit: number | null;
  retryCooldownMinutes: number;
  refresherWarnDays: number | null;
  refresherBlockDays: number | null;
  maxAgeDays: number | null;
  lapsedPolicy: LapsedPolicy;
  addonGraceDays: number;
  addonReminderDays: number[];
  randomDrawEnabled: boolean;
}

export interface AdminTrainingSummary {
  id: number;
  slug: string;
  title: string;
  kind: TrainingKind;
  equipmentGroupId: number | null;
  requiresSignoff: boolean;
  currentVersionId: number | null;
  currentVersionNo: number | null;
  draftVersionId: number | null;
  archived: boolean;
}

export interface VersionSummary {
  id: number;
  trainingId: number;
  versionNo: number;
  status: VersionStatus;
  publishImpact: PublishImpact | null;
  publishReason: string | null;
  publishedBy: number | null;
  publishedAt: string | null;
  createdAt: string;
  stepCount: number;
}

export interface AdminTraining {
  id: number;
  slug: string;
  title: string;
  summary: string | null;
  kind: TrainingKind;
  equipmentGroupId: number | null;
  requiresSignoff: boolean;
  currentVersionId: number | null;
  archived: boolean;
  settings: TrainingSettings;
  versions: VersionSummary[];
}

export interface CreateTrainingBody {
  slug: string;
  title: string;
  summary?: string | null;
  kind: TrainingKind;
  equipmentGroupId?: number | null;
}

export interface UpdateTrainingBody {
  title?: string;
  summary?: string;
  equipmentGroupId?: number;
  archived?: boolean;
}

// ---- Drafts, steps, blueprint ----

export interface ChecklistItem {
  key: string;
  label: string;
}

export interface BlueprintRule {
  topicId: number;
  topicSlug: string;
  drawCount: number;
  /** The topic's eligible questions: checkpoint and gate questions are not counted. */
  poolSize: number;
}

export interface VideoCheckpointSetting {
  atSeconds: number;
  questionVersionId: number;
}

/** `checkpoints` and `outcomes` are known; anything else is passed through untouched. */
export interface StepSettings {
  checkpoints?: VideoCheckpointSetting[];
  outcomes?: string[];
  [key: string]: unknown;
}

export interface AdminStep {
  id: number;
  position: number;
  type: StepType;
  title: string;
  bodyMarkdown: string | null;
  videoAssetKey: string | null;
  videoDurationSeconds: number | null;
  minWatchPercent: number;
  gateQuestionVersionId: number | null;
  addonScope: boolean;
  settings: StepSettings | null;
  blueprint: BlueprintRule[];
}

export interface VersionDetail {
  version: VersionSummary;
  signoffChecklist: ChecklistItem[];
  steps: AdminStep[];
}

export interface StepBody {
  type: StepType;
  title: string;
  bodyMarkdown?: string | null;
  videoAssetKey?: string | null;
  videoDurationSeconds?: number | null;
  minWatchPercent?: number;
  gateQuestionVersionId?: number | null;
  addonScope?: boolean;
  settings?: StepSettings | null;
  position?: number;
}

export interface BlueprintRuleBody {
  topicId: number;
  /** Null or left out: every eligible question of the topic. */
  drawCount?: number | null;
}

export interface VideoUploadUrlRequest {
  contentType: 'video/mp4';
  sizeBytes: number;
}

export interface VideoUploadUrl {
  assetKey: string;
  method: 'PUT';
  uploadUrl: string;
  requiredHeaders: Record<string, string>;
  expiresAt: string;
}

// ---- Question bank ----

export interface Topic {
  id: number;
  trainingId: number;
  slug: string;
  name: string;
  questionCount: number;
}

export interface QuestionOptionBody {
  /** Keep the option's identity when editing an unused question version. */
  id?: number;
  labelMarkdown: string;
  correct: boolean;
}

export interface QuestionBody {
  topicId: number;
  type: AdminQuestionType;
  promptMarkdown: string;
  explanationMarkdown?: string | null;
  critical?: boolean;
  remediationStepPosition?: number | null;
  options: QuestionOptionBody[];
}

export interface QuestionOption {
  id: number;
  position: number;
  labelMarkdown: string;
  correct: boolean;
}

export interface QuestionVersion {
  id: number;
  versionNo: number;
  type: QuestionType;
  promptMarkdown: string;
  explanationMarkdown: string | null;
  critical: boolean;
  remediationStepPosition: number | null;
  options: QuestionOption[];
  createdAt: string;
}

export interface AdminQuestion {
  id: number;
  trainingId: number;
  topicId: number;
  topicSlug: string;
  active: boolean;
  versionCount: number;
  latest: QuestionVersion;
  /** Only the single-question endpoint fills this. */
  versions?: QuestionVersion[] | null;
}

export interface QuestionDeleteResult {
  deleted: boolean;
  retired: boolean;
}

// ---- Publishing ----

export interface ValidationIssue {
  path?: string | null;
  message: string;
  line?: number | null;
  column?: number | null;
}

export interface PublishCheck {
  ready: boolean;
  issues: ValidationIssue[];
}

export interface PublishResult {
  version: VersionSummary;
  retiredVersionId: number | null;
  poolSize: number;
  effects: {
    addonRequired: number;
    lapsed: number;
    addonDueAt: string | null;
  };
}

// ---- Corrections, re-scoring, report ----

export interface CorrectionBody {
  kind: CorrectionKind;
  optionId?: number;
  reason: string;
}

export interface AttemptOutcomeChange {
  attemptId: number;
  studentId: number;
  trainingId: number;
  storedStatus: string;
  correctedPass: boolean;
  storedScorePercent: number | null;
  correctedScorePercent: number;
  criticalAllCorrect: boolean;
}

export interface Rescore {
  passMarkPercent: number;
  attemptsRescored: number;
  changedOutcomes: AttemptOutcomeChange[];
  skippedAnswers: number;
}

export interface Correction {
  id: number;
  questionVersionId: number;
  kind: CorrectionKind;
  optionId: number | null;
  reason: string;
  actor: number;
  createdAt: string;
  /** Filled when the correction was just recorded. */
  rescore?: Rescore | null;
}

export interface QuestionReportRow {
  questionId: number;
  questionVersionId: number;
  versionNo: number;
  topicSlug: string;
  promptMarkdown: string;
  critical: boolean;
  active: boolean;
  timesShown: number;
  timesAnswered: number;
  timesCorrect: number;
  percentCorrect: number | null;
  mostChosenWrongOption: { optionId: number; label: string; timesChosen: number } | null;
  corrections: number;
}

// ---- Import ----

export interface ImportError {
  line: number | null;
  column: number | null;
  path: string | null;
  message: string;
}

export interface ImportSummary {
  trainingSlug: string;
  title: string;
  kind: TrainingKind;
  topics: number;
  questions: number;
  steps: { position: number; type: StepType; title: string }[];
  signoffChecklistItems: number;
  newTraining: boolean;
  draftVersionNo: number;
  questionsAdded: number;
  questionsChanged: number;
  questionsUnchanged: number;
  questionsRetired: number;
}

export interface ImportPreview {
  valid: boolean;
  errors: ImportError[];
  summary: ImportSummary | null;
}

export interface ImportResult {
  trainingId: number;
  draftVersionId: number;
  summary: ImportSummary;
}
