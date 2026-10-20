import type {
  Agreement,
  Attempt,
  AttemptStep,
  Question,
  TrainingSummary,
  VideoBlock,
  VideoCheckpoint,
} from '@/types/training';

export const createQuestion = (overrides: Partial<Question> = {}): Question => ({
  questionVersionId: 501,
  type: 'SINGLE',
  selection: 'SINGLE',
  promptMarkdown: 'Where is the emergency stop?',
  options: [
    { optionId: 1, label: 'On the front panel' },
    { optionId: 2, label: 'Behind the machine' },
  ],
  selectedOptionIds: null,
  ...overrides,
});

export const createCheckpoint = (overrides: Partial<VideoCheckpoint> = {}): VideoCheckpoint => ({
  checkpointId: 11,
  atSeconds: 20,
  passed: false,
  question: createQuestion({
    questionVersionId: 601,
    promptMarkdown: 'What did the video just show?',
  }),
  ...overrides,
});

export const createVideoBlock = (overrides: Partial<VideoBlock> = {}): VideoBlock => ({
  durationSeconds: 120,
  minWatchPercent: 90,
  watchedPercent: 0,
  watchedRanges: [],
  checkpoints: [],
  ...overrides,
});

export const createVideoStep = (overrides: Partial<AttemptStep> = {}): AttemptStep => ({
  stepId: 7,
  position: 1,
  type: 'VIDEO',
  title: 'Welcome video',
  status: 'AVAILABLE',
  addonScope: false,
  video: createVideoBlock(),
  ...overrides,
});

export const createAttempt = (overrides: Partial<Attempt> = {}): Attempt => ({
  attemptId: 42,
  trainingSlug: 'maker-orientation',
  trainingTitle: 'Maker Orientation',
  kind: 'FULL',
  status: 'IN_PROGRESS',
  versionNo: 1,
  pledgeRequired: false,
  pledgeText: 'I will do this myself. My engagement is recorded.',
  startedAt: '2026-10-20T12:00:00Z',
  completedAt: null,
  scorePercent: null,
  criticalAllCorrect: null,
  reviewSteps: [],
  steps: [createVideoStep()],
  ...overrides,
});

export const createTrainingSummary = (
  overrides: Partial<TrainingSummary> = {},
): TrainingSummary => ({
  trainingId: 1,
  slug: 'maker-orientation',
  title: 'Maker Orientation',
  summary: 'Safety and how the space works.',
  kind: 'ORIENTATION',
  requiresSignoff: false,
  versionNo: 1,
  stepCount: 3,
  certification: null,
  nextAction: 'START',
  inProgressAttemptId: null,
  retryAt: null,
  blockedReason: null,
  ...overrides,
});

export const createAgreement = (overrides: Partial<Agreement> = {}): Agreement => ({
  agreementId: 1,
  kind: 'TERMS_OF_SERVICE',
  versionNo: 1,
  title: 'Terms of Service',
  bodyMarkdown: '# Terms\n\nBe kind to the machines.',
  publishedAt: '2026-10-01T00:00:00Z',
  ...overrides,
});
