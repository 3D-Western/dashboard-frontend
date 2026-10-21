import { ApiError } from '@/api/client/errors';
import { PreviewProblemError, TrainingErrorCodes } from '@/api/client/training-errors';
import { gradePreviewQuiz, isAnswerCorrect } from '@/lib/training-preview-grade';
import { mergeRanges } from '@/lib/video-watch';
import type {
  Attempt,
  AttemptStep,
  CheckpointAnswerResult,
  HeartbeatResult,
  Question,
  Quiz,
  QuizAnswer,
  QuizResult,
  ReadingCompleteResult,
  StepCompletedResult,
  TimeRange,
  VideoPlayback,
} from '@/types/training';
import type {
  PreviewAnswerKey,
  PreviewControls,
  PreviewQuiz,
  PreviewVideo,
  QuizReveal,
  TrainingPreview,
  TrainingRuntimeApi,
} from '@/types/training-preview';

/** Ask for a fresh video link when the one in hand has under this long left. */
const LINK_MARGIN_MS = 60_000;

interface VideoState {
  ranges: TimeRange[];
  passed: Set<number>;
}

interface QuizState {
  questions: Question[];
  problem: string | null;
  answers: Record<number, number[]>;
  opened: boolean;
  reveal: QuizReveal | null;
}

export interface PreviewSessionOptions {
  versionLabel: string;
  exitHref: string;
  /**
   * Fetches the preview again. Used for a fresh quiz draw on retake and a fresh video link when one
   * has expired. Optional: without it a retake reuses the same questions.
   */
  refetch?: () => Promise<TrainingPreview>;
}

export interface PreviewSession {
  api: TrainingRuntimeApi;
  controls: PreviewControls;
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/**
 * A walk through a training that lives entirely in the browser. It answers the same calls the
 * learner components make to the server, from the data of one preview fetch, and keeps progress in
 * memory: nothing is sent, so nothing can be recorded. Steps unlock in order like a real attempt;
 * the pledge comes first.
 */
export function createPreviewSession(
  preview: TrainingPreview,
  options: PreviewSessionOptions,
): PreviewSession {
  const keys = new Map<number, PreviewAnswerKey>(
    preview.answerKey.map((k) => [k.questionVersionId, k]),
  );
  let videos = new Map<number, PreviewVideo>(preview.videos.map((v) => [v.stepId, v]));
  const stepsById = new Map<number, AttemptStep>(preview.attempt.steps.map((s) => [s.stepId, s]));

  let pledged = false;
  let done = new Set<number>();
  let videoStates = new Map<number, VideoState>();
  let lastScore: number | null = null;
  const quizStates = new Map<number, QuizState>();

  const freshQuizState = (quiz: PreviewQuiz): QuizState => ({
    questions: clone(quiz.questions),
    problem: quiz.problem,
    answers: {},
    opened: false,
    reveal: null,
  });
  /** What each quiz step draws: the first fetch, replaced as a whole by a retake's fresh fetch. */
  let drawn: PreviewQuiz[] = preview.quizzes;
  const resetQuizzes = () => {
    quizStates.clear();
    drawn.forEach((quiz) => quizStates.set(quiz.stepId, freshQuizState(quiz)));
  };
  resetQuizzes();

  const videoState = (stepId: number): VideoState => {
    let state = videoStates.get(stepId);
    if (!state) {
      state = { ranges: [], passed: new Set() };
      videoStates.set(stepId, state);
    }
    return state;
  };
  const quizState = (stepId: number): QuizState => {
    const state = quizStates.get(stepId);
    if (!state) throw new PreviewProblemError('That quiz is not part of this preview.');
    return state;
  };

  const coveredSeconds = (stepId: number, duration: number): number =>
    mergeRanges(videoState(stepId).ranges).reduce(
      (sum, r) => sum + Math.max(0, Math.min(r.end, duration) - Math.max(r.start, 0)),
      0,
    );
  const watchedPercent = (stepId: number): number => {
    const duration = stepsById.get(stepId)?.video?.durationSeconds ?? 0;
    return duration > 0 ? Math.min(100, (coveredSeconds(stepId, duration) / duration) * 100) : 0;
  };
  const checkpointsOf = (stepId: number) =>
    [...(stepsById.get(stepId)?.video?.checkpoints ?? [])].sort(
      (a, b) => a.atSeconds - b.atSeconds,
    );
  const remainingCheckpoints = (stepId: number) =>
    checkpointsOf(stepId)
      .filter((c) => !videoState(stepId).passed.has(c.checkpointId))
      .map((c) => c.checkpointId);

  /** A video step is done when enough is watched and every checkpoint is answered right. */
  const videoComplete = (stepId: number): boolean =>
    watchedPercent(stepId) >= (stepsById.get(stepId)?.video?.minWatchPercent ?? 100) &&
    remainingCheckpoints(stepId).length === 0;

  const currentStepId = (): number | null =>
    preview.attempt.steps.find((s) => !done.has(s.stepId))?.stepId ?? null;
  const allDone = () => currentStepId() === null;

  const requireStep = (stepId: number): AttemptStep => {
    const step = stepsById.get(stepId);
    if (!step) throw new PreviewProblemError('That step is not part of this preview.');
    return step;
  };

  const attemptView = (): Attempt => {
    const current = pledged ? currentStepId() : null;
    const steps = preview.attempt.steps.map((original): AttemptStep => {
      const step = clone(original);
      const finished = done.has(step.stepId);
      const status = finished ? 'COMPLETED' : step.stepId === current ? 'AVAILABLE' : 'LOCKED';
      if (status === 'LOCKED') {
        // Like the real thing: nothing of a locked step is revealed.
        return { ...step, status, video: null, reading: null, attestation: null, quiz: null };
      }
      if (step.video) {
        const state = videoState(step.stepId);
        step.video.watchedPercent = watchedPercent(step.stepId);
        step.video.watchedRanges = mergeRanges(state.ranges);
        step.video.checkpoints = step.video.checkpoints.map((c) => ({
          ...c,
          passed: state.passed.has(c.checkpointId),
        }));
      }
      if (step.quiz) {
        const quiz = quizStates.get(step.stepId);
        step.quiz = {
          opened: quiz?.opened ?? false,
          questionCount: quiz?.questions.length ?? 0,
          answeredCount: Object.values(quiz?.answers ?? {}).filter((a) => a.length > 0).length,
        };
      }
      return { ...step, status };
    });
    const finishedAll = allDone();
    return {
      ...clone(preview.attempt),
      status: finishedAll ? 'PASSED' : 'IN_PROGRESS',
      pledgeRequired: !pledged,
      scorePercent: finishedAll ? lastScore : null,
      completedAt: finishedAll ? new Date().toISOString() : null,
      steps,
    };
  };

  const completed = (stepId: number): StepCompletedResult => {
    done.add(stepId);
    return { stepCompleted: true, attemptStatus: allDone() ? 'PASSED' : 'IN_PROGRESS' };
  };

  const quizView = (stepId: number): Quiz => {
    const state = quizState(stepId);
    return {
      stepId,
      questions: state.questions.map((q) => ({
        ...q,
        selectedOptionIds: state.answers[q.questionVersionId] ?? null,
      })),
    };
  };

  const storeAnswers = (state: QuizState, answers: QuizAnswer[]) => {
    state.answers = {};
    for (const answer of answers) state.answers[answer.questionVersionId] = [...answer.optionIds];
  };

  // ---- The calls the learner components make -------------------------------------------------

  const api: TrainingRuntimeApi = {
    getAttempt: async () => attemptView(),

    acceptPledge: async () => {
      pledged = true;
      return attemptView();
    },

    abandonAttempt: async () => {
      // The preview has no cancel button; restarting is the way to begin again.
      return attemptView();
    },

    getPlaybackUrl: async (_attemptId, stepId): Promise<VideoPlayback> => {
      const usable = (v: PreviewVideo | undefined) =>
        !!v?.url && !!v.expiresAt && new Date(v.expiresAt).getTime() > Date.now() + LINK_MARGIN_MS;
      let video = videos.get(stepId);
      // A problem (no file, or a checkpoint whose question is gone) means this step is not ready to preview.
      if (video?.problem) throw new PreviewProblemError(video.problem);
      if (!usable(video) && options.refetch) {
        try {
          const fresh = await options.refetch();
          videos = new Map(fresh.videos.map((v) => [v.stepId, v]));
          video = videos.get(stepId);
        } catch {
          // Keep what we had; the check below explains if it is not usable.
        }
      }
      if (!video?.url || !video.expiresAt) {
        throw new PreviewProblemError(
          video?.problem ?? "This video can't be played in the preview yet.",
        );
      }
      return {
        url: video.url,
        expiresAt: video.expiresAt,
        durationSeconds: video.durationSeconds ?? requireStep(stepId).video?.durationSeconds ?? 0,
      };
    },

    sendHeartbeat: async (_attemptId, stepId, body): Promise<HeartbeatResult> => {
      const state = videoState(stepId);
      state.ranges = mergeRanges([...state.ranges, ...body.ranges]);
      const stepCompleted = !done.has(stepId) && videoComplete(stepId);
      if (stepCompleted) done.add(stepId);
      const duration = requireStep(stepId).video?.durationSeconds ?? 0;
      return {
        watchedPercent: watchedPercent(stepId),
        creditedSeconds: coveredSeconds(stepId, duration),
        capped: false,
        stepCompleted,
        checkpointsRemaining: remainingCheckpoints(stepId),
      };
    },

    answerCheckpoint: async (
      _attemptId,
      stepId,
      checkpointId,
      optionIds,
    ): Promise<CheckpointAnswerResult> => {
      const checkpoints = checkpointsOf(stepId);
      const index = checkpoints.findIndex((c) => c.checkpointId === checkpointId);
      const key = keys.get(checkpointId);
      if (index === -1 || !key) {
        throw new ApiError(
          TrainingErrorCodes.CHECKPOINT_NOT_FOUND,
          'Checkpoint not in the preview',
        );
      }
      if (!isAnswerCorrect(key, checkpoints[index].question.type, optionIds)) {
        // Wrong: back to the previous checkpoint (or the start). The answer is not revealed.
        return {
          correct: false,
          rewatchFromSeconds: index > 0 ? checkpoints[index - 1].atSeconds : 0,
          stepCompleted: false,
        };
      }
      videoState(stepId).passed.add(checkpointId);
      const stepCompleted = !done.has(stepId) && videoComplete(stepId);
      if (stepCompleted) done.add(stepId);
      return { correct: true, rewatchFromSeconds: null, stepCompleted };
    },

    completeReading: async (_attemptId, stepId, body): Promise<ReadingCompleteResult> => {
      const gate = requireStep(stepId).reading?.gateQuestion ?? null;
      if (gate) {
        const key = keys.get(gate.questionVersionId);
        const right = !!key && isAnswerCorrect(key, gate.type, body.optionIds ?? []);
        if (!right) return { stepCompleted: false, gateCorrect: false };
        done.add(stepId);
        return { stepCompleted: true, gateCorrect: true };
      }
      done.add(stepId);
      return { stepCompleted: true, gateCorrect: null };
    },

    acceptAttestation: async (_attemptId, stepId) => completed(stepId),

    openQuiz: async (_attemptId, stepId) => {
      const state = quizState(stepId);
      if (state.problem) throw new PreviewProblemError(state.problem);
      state.opened = true;
      return quizView(stepId);
    },

    saveQuizAnswers: async (_attemptId, stepId, answers) => {
      storeAnswers(quizState(stepId), answers);
      return quizView(stepId);
    },

    submitQuiz: async (_attemptId, stepId, answers): Promise<QuizResult> => {
      const state = quizState(stepId);
      if (answers) storeAnswers(state, answers);
      const unanswered = state.questions
        .filter((q) => !keys.get(q.questionVersionId)?.dropped)
        .filter((q) => !(state.answers[q.questionVersionId]?.length > 0))
        .map((q) => q.questionVersionId);
      if (unanswered.length > 0) {
        throw new ApiError(TrainingErrorCodes.QUIZ_INCOMPLETE, 'Answer every question.', {
          unanswered,
        });
      }
      const grade = gradePreviewQuiz(state.questions, state.answers, keys, preview.passMarkPercent);
      const reviewSteps = preview.attempt.steps
        .filter((s) => grade.reviewStepPositions.includes(s.position))
        .map((s) => ({ position: s.position, stepId: s.stepId, title: s.title }));
      const result: QuizResult = {
        passed: grade.passed,
        scorePercent: grade.scorePercent,
        criticalAllCorrect: grade.criticalAllCorrect,
        passMarkPercent: preview.passMarkPercent,
        attemptStatus: 'IN_PROGRESS',
        reviewSteps,
        certificationStatus: null,
        retryAt: null,
      };
      lastScore = grade.scorePercent;
      state.reveal = {
        result,
        questions: state.questions.map((question) => {
          const key = keys.get(question.questionVersionId);
          return {
            question,
            selected: state.answers[question.questionVersionId] ?? [],
            correct: grade.correctByQuestion[question.questionVersionId] ?? false,
            dropped: key?.dropped ?? false,
            critical: key?.critical ?? false,
            correctOptionIds: [...(key?.correctOptionIds ?? []), ...(key?.acceptedOptionIds ?? [])],
            explanationMarkdown: key?.explanationMarkdown ?? null,
          };
        }),
      };
      return result;
    },
  };

  // ---- Preview-only controls ------------------------------------------------------------------

  const controls: PreviewControls = {
    versionLabel: options.versionLabel,
    exitHref: options.exitHref,

    skipStep: () => {
      const id = currentStepId();
      if (id !== null) done.add(id);
    },

    restart: () => {
      pledged = false;
      done = new Set();
      videoStates = new Map();
      lastScore = null;
      resetQuizzes();
    },

    quizReveal: (stepId) => quizStates.get(stepId)?.reveal ?? null,

    finishQuiz: (stepId) => {
      if (quizStates.get(stepId)?.reveal?.result.passed) done.add(stepId);
    },

    retakeQuiz: async (stepId) => {
      if (options.refetch) {
        try {
          // One fetch redraws every quiz step together, so no question can appear in two of them
          // (the server draws them as one set), and brings a fresh answer key.
          const fresh = await options.refetch();
          fresh.answerKey.forEach((k) => keys.set(k.questionVersionId, k));
          drawn = fresh.quizzes;
          resetQuizzes();
          return;
        } catch {
          // Offline or signed out: retake the same questions.
        }
      }
      const same = drawn.find((q) => q.stepId === stepId);
      if (same) quizStates.set(stepId, freshQuizState(same));
    },
  };

  return { api, controls };
}
