import type {
  AdminQuestion,
  AdminStep,
  AdminTraining,
  AdminTrainingSummary,
  EquipmentGroup,
  Machine,
  QuestionReportRow,
  QuestionVersion,
  Topic,
  TrainingSettings,
  VersionDetail,
  VersionSummary,
} from '@/types/training-admin';

export const createSettings = (overrides: Partial<TrainingSettings> = {}): TrainingSettings => ({
  passMarkPercent: 90,
  attemptLimit: null,
  retryCooldownMinutes: 60,
  refresherWarnDays: null,
  refresherBlockDays: null,
  maxAgeDays: null,
  lapsedPolicy: 'QUIZ',
  addonGraceDays: 30,
  addonReminderDays: [14, 7, 3, 1],
  randomDrawEnabled: false,
  ...overrides,
});

export const createVersionSummary = (overrides: Partial<VersionSummary> = {}): VersionSummary => ({
  id: 100,
  trainingId: 1,
  versionNo: 1,
  status: 'DRAFT',
  publishImpact: null,
  publishReason: null,
  publishedBy: null,
  publishedAt: null,
  createdAt: '2026-10-20T12:00:00Z',
  stepCount: 0,
  ...overrides,
});

export const createAdminTraining = (overrides: Partial<AdminTraining> = {}): AdminTraining => ({
  id: 1,
  slug: 'laser-cutter',
  title: 'Laser Cutter',
  summary: 'Safe use of the laser cutters.',
  kind: 'EQUIPMENT',
  equipmentGroupId: 5,
  requiresSignoff: true,
  currentVersionId: null,
  archived: false,
  settings: createSettings(),
  versions: [],
  ...overrides,
});

export const createTrainingSummary = (
  overrides: Partial<AdminTrainingSummary> = {},
): AdminTrainingSummary => ({
  id: 1,
  slug: 'laser-cutter',
  title: 'Laser Cutter',
  kind: 'EQUIPMENT',
  equipmentGroupId: 5,
  requiresSignoff: true,
  currentVersionId: null,
  currentVersionNo: null,
  draftVersionId: null,
  archived: false,
  ...overrides,
});

export const createAdminStep = (overrides: Partial<AdminStep> = {}): AdminStep => ({
  id: 11,
  position: 1,
  type: 'READING',
  title: 'Safe operation',
  bodyMarkdown: '## Before you cut\nCheck the fan.',
  videoAssetKey: null,
  videoDurationSeconds: null,
  minWatchPercent: 90,
  gateQuestionVersionId: null,
  addonScope: false,
  settings: null,
  blueprint: [],
  ...overrides,
});

export const createVersionDetail = (
  steps: AdminStep[] = [],
  overrides: Partial<VersionDetail> = {},
): VersionDetail => ({
  version: createVersionSummary({ stepCount: steps.length }),
  signoffChecklist: [],
  steps,
  ...overrides,
});

export const createQuestionVersion = (
  overrides: Partial<QuestionVersion> = {},
): QuestionVersion => ({
  id: 501,
  versionNo: 1,
  type: 'SINGLE',
  promptMarkdown: 'Where is the emergency stop?',
  explanationMarkdown: null,
  critical: false,
  remediationStepPosition: null,
  options: [
    { id: 1, position: 1, labelMarkdown: 'On the front panel', correct: true },
    { id: 2, position: 2, labelMarkdown: 'Behind the machine', correct: false },
  ],
  createdAt: '2026-10-20T12:00:00Z',
  ...overrides,
});

export const createAdminQuestion = (overrides: Partial<AdminQuestion> = {}): AdminQuestion => ({
  id: 41,
  trainingId: 1,
  topicId: 7,
  topicSlug: 'safety',
  active: true,
  versionCount: 1,
  latest: createQuestionVersion(),
  ...overrides,
});

export const createTopic = (overrides: Partial<Topic> = {}): Topic => ({
  id: 7,
  trainingId: 1,
  slug: 'safety',
  name: 'Safety',
  questionCount: 2,
  ...overrides,
});

export const createGroup = (overrides: Partial<EquipmentGroup> = {}): EquipmentGroup => ({
  id: 5,
  slug: 'laser-cutters',
  name: 'Laser cutters',
  description: null,
  active: true,
  machineCount: 1,
  ...overrides,
});

export const createMachine = (overrides: Partial<Machine> = {}): Machine => ({
  id: 9,
  slug: 'epilog-1',
  name: 'Epilog 1',
  equipmentGroupId: 5,
  equipmentGroupSlug: 'laser-cutters',
  location: 'Sabourin',
  active: true,
  ...overrides,
});

export const createReportRow = (overrides: Partial<QuestionReportRow> = {}): QuestionReportRow => ({
  questionId: 41,
  questionVersionId: 501,
  versionNo: 1,
  topicSlug: 'safety',
  promptMarkdown: 'Where is the emergency stop?',
  critical: false,
  active: true,
  timesShown: 20,
  timesAnswered: 20,
  timesCorrect: 8,
  percentCorrect: 40,
  mostChosenWrongOption: { optionId: 2, label: 'Behind the machine', timesChosen: 9 },
  corrections: 0,
  ...overrides,
});
