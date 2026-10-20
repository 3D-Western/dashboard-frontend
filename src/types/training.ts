export type TrainingLevel = 'LEVEL_1' | 'LEVEL_2';

// ---------------------------------------------------------------------------------------------
// Learner training API (/api/v1/training). Shapes follow the "Learner API" section of
// docs/plans/training-v1.md. No response ever carries correct answers, a question's critical flag
// or an explanation, so none of these types have a field for them.
// ---------------------------------------------------------------------------------------------

export type TrainingKind = 'ORIENTATION' | 'EQUIPMENT';

export type CertificationStatus =
  | 'IN_PROGRESS'
  | 'AWAITING_SIGNOFF'
  | 'ACTIVE'
  | 'REFRESHER_DUE'
  | 'LAPSED'
  | 'REVOKED';

export type NextAction =
  | 'START'
  | 'RESUME'
  | 'START_ADDON'
  | 'START_REFRESHER'
  | 'AWAITING_SIGNOFF'
  | 'NONE'
  | 'BLOCKED';

export interface Certification {
  status: CertificationStatus;
  activeSince: string | null;
  expiresAt: string | null;
  addonRequired: boolean;
  addonDueAt: string | null;
}

export interface TrainingSummary {
  trainingId: number;
  slug: string;
  title: string;
  summary: string | null;
  kind: TrainingKind;
  requiresSignoff: boolean;
  versionNo: number;
  stepCount: number;
  certification: Certification | null;
  nextAction: NextAction;
  inProgressAttemptId: number | null;
  retryAt: string | null;
  /** The error code the start endpoint would answer with, when `nextAction` is BLOCKED. */
  blockedReason: string | null;
}

export interface MyTrainings {
  orientationComplete: boolean;
  trainings: TrainingSummary[];
}

export type StepType = 'VIDEO' | 'READING' | 'QUIZ' | 'ATTESTATION';
export type StepStatus = 'LOCKED' | 'AVAILABLE' | 'COMPLETED';
export type AttemptKind = 'FULL' | 'ADDON' | 'REFRESHER';
export type AttemptStatus = 'IN_PROGRESS' | 'PASSED' | 'FAILED' | 'ABANDONED';
export type QuestionType = 'SINGLE' | 'MULTI' | 'TRUE_FALSE' | 'HOTSPOT';

export interface QuestionOption {
  optionId: number;
  label: string;
}

export interface Question {
  questionVersionId: number;
  type: QuestionType;
  /** SINGLE: pick one. MULTIPLE: pick all that apply. */
  selection: 'SINGLE' | 'MULTIPLE';
  promptMarkdown: string;
  options: QuestionOption[];
  /** Quiz questions only: what the learner saved so far (not graded). */
  selectedOptionIds?: number[] | null;
}

export interface TimeRange {
  start: number;
  end: number;
}

export interface VideoCheckpoint {
  checkpointId: number;
  atSeconds: number;
  passed: boolean;
  question: Question;
}

export interface VideoBlock {
  durationSeconds: number;
  minWatchPercent: number;
  watchedPercent: number;
  watchedRanges: TimeRange[];
  checkpoints: VideoCheckpoint[];
}

export interface ReadingBlock {
  bodyMarkdown: string;
  dwellSeconds: number;
  gateQuestion: Question | null;
}

export interface AttestationBlock {
  text: string;
}

export interface QuizBlock {
  opened: boolean;
  questionCount: number;
  answeredCount: number;
}

export interface AttemptStep {
  stepId: number;
  position: number;
  type: StepType;
  title: string;
  status: StepStatus;
  isAddonScope: boolean;
  video?: VideoBlock | null;
  reading?: ReadingBlock | null;
  attestation?: AttestationBlock | null;
  quiz?: QuizBlock | null;
}

export interface ReviewStep {
  position: number;
  stepId: number;
  title: string;
}

export interface Attempt {
  attemptId: number;
  trainingSlug: string;
  trainingTitle: string;
  kind: AttemptKind;
  status: AttemptStatus;
  versionNo: number;
  pledgeRequired: boolean;
  pledgeText: string;
  startedAt: string;
  completedAt: string | null;
  scorePercent: number | null;
  criticalAllCorrect: boolean | null;
  reviewSteps: ReviewStep[];
  steps: AttemptStep[];
}

export interface VideoPlayback {
  url: string;
  expiresAt: string;
  durationSeconds: number;
}

export interface HeartbeatBody {
  ranges: TimeRange[];
  focusLossCount: number;
}

export interface HeartbeatResult {
  watchedPercent: number;
  creditedSeconds: number;
  capped: boolean;
  stepCompleted: boolean;
  checkpointsRemaining: number[];
}

export interface CheckpointAnswerResult {
  correct: boolean;
  rewatchFromSeconds: number | null;
  stepCompleted: boolean;
}

export interface ReadingCompleteResult {
  stepCompleted: boolean;
  gateCorrect: boolean | null;
}

export interface StepCompletedResult {
  stepCompleted: boolean;
  attemptStatus: AttemptStatus;
}

export interface QuizAnswer {
  questionVersionId: number;
  optionIds: number[];
}

export interface Quiz {
  stepId: number;
  questions: Question[];
}

export interface QuizResult {
  passed: boolean;
  scorePercent: number;
  criticalAllCorrect: boolean;
  passMarkPercent: number;
  attemptStatus: AttemptStatus;
  reviewSteps: ReviewStep[];
  certificationStatus: CertificationStatus | null;
  retryAt: string | null;
}

export type AgreementKind =
  | 'TERMS_OF_SERVICE'
  | 'MEDIA_CONSENT'
  | 'LIABILITY_WAIVER'
  | 'CODE_OF_CONDUCT';

export interface Agreement {
  agreementId: number;
  kind: AgreementKind;
  versionNo: number;
  title: string;
  bodyMarkdown: string;
  publishedAt: string | null;
}
