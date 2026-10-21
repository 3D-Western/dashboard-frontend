import type { Question } from '@/types/training';
import type { PreviewAnswerKey, TrainingPreview } from '@/types/training-preview';

const question = (id: number, overrides: Partial<Question> & { optionIds: number[] }): Question => {
  const { optionIds, ...rest } = overrides;
  return {
    questionVersionId: id,
    type: 'SINGLE',
    selection: 'SINGLE',
    promptMarkdown: `Question ${id}?`,
    options: optionIds.map((optionId) => ({ optionId, label: `Option ${optionId}` })),
    selectedOptionIds: null,
    ...rest,
  };
};

export const createKey = (overrides: Partial<PreviewAnswerKey> = {}): PreviewAnswerKey => ({
  questionVersionId: 0,
  correctOptionIds: [],
  acceptedOptionIds: [],
  critical: false,
  dropped: false,
  explanationMarkdown: null,
  remediationStepPosition: null,
  ...overrides,
});

/**
 * A four-step training as the preview endpoint returns it: a video (100 s, a question at 50 s), a
 * reading with a gate question, an attestation and a quiz of three questions. Ids to know:
 * steps 1 to 4; checkpoint question 601 (right: 11); gate question 602 (right: 21);
 * quiz 701 (right: 31), 702 (multiple; right: 41 and 42), 703 (critical true/false; right: 51).
 */
export const createPreview = (overrides: Partial<TrainingPreview> = {}): TrainingPreview => {
  const quizQuestions = [
    question(701, { optionIds: [31, 32, 33] }),
    question(702, { type: 'MULTI', selection: 'MULTIPLE', optionIds: [41, 42, 43] }),
    question(703, { type: 'TRUE_FALSE', optionIds: [51, 52] }),
  ];
  return {
    passMarkPercent: 90,
    attempt: {
      attemptId: 0,
      trainingSlug: 'laser-cutter',
      trainingTitle: 'Laser Cutter',
      kind: 'FULL',
      status: 'IN_PROGRESS',
      versionNo: 2,
      pledgeRequired: true,
      pledgeText: 'I will do this training honestly.',
      startedAt: '2026-10-20T12:00:00Z',
      completedAt: null,
      scorePercent: null,
      criticalAllCorrect: null,
      reviewSteps: [],
      steps: [
        {
          stepId: 1,
          position: 1,
          type: 'VIDEO',
          title: 'Meet the machine',
          status: 'AVAILABLE',
          addonScope: false,
          video: {
            durationSeconds: 100,
            minWatchPercent: 90,
            watchedPercent: 0,
            watchedRanges: [],
            checkpoints: [
              {
                checkpointId: 601,
                atSeconds: 50,
                passed: false,
                question: question(601, { optionIds: [11, 12] }),
              },
            ],
          },
        },
        {
          stepId: 2,
          position: 2,
          type: 'READING',
          title: 'Safe operation',
          status: 'AVAILABLE',
          addonScope: false,
          reading: {
            bodyMarkdown: 'Keep the lid closed.',
            dwellSeconds: 0,
            gateQuestion: question(602, { optionIds: [21, 22] }),
          },
        },
        {
          stepId: 3,
          position: 3,
          type: 'ATTESTATION',
          title: 'Confirm',
          status: 'AVAILABLE',
          addonScope: false,
          attestation: { text: 'I will follow the rules.' },
        },
        {
          stepId: 4,
          position: 4,
          type: 'QUIZ',
          title: 'Final quiz',
          status: 'AVAILABLE',
          addonScope: false,
          quiz: { opened: false, questionCount: 3, answeredCount: 0 },
        },
      ],
    },
    quizzes: [{ stepId: 4, questions: quizQuestions, problem: null }],
    answerKey: [
      createKey({ questionVersionId: 601, correctOptionIds: [11] }),
      createKey({ questionVersionId: 602, correctOptionIds: [21] }),
      createKey({
        questionVersionId: 701,
        correctOptionIds: [31],
        explanationMarkdown: 'The first one, because of the fire risk.',
        remediationStepPosition: 2,
      }),
      createKey({ questionVersionId: 702, correctOptionIds: [41, 42] }),
      createKey({ questionVersionId: 703, correctOptionIds: [51], critical: true }),
    ],
    videos: [
      {
        stepId: 1,
        url: 'https://videos.test/laser.mp4',
        expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
        durationSeconds: 100,
        problem: null,
      },
    ],
    ...overrides,
  };
};
