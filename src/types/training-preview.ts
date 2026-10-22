// ---------------------------------------------------------------------------------------------
// Staff preview of a training ("Preview as student"). Shapes follow GET
// /api/v1/admin/training/versions/{versionId}/preview in docs/plans/training-v1.md ("Authoring
// API"). `attempt` has exactly the learner attempt shape, so the learner player renders it.
// Unlike the learner types, these carry the answer key: only staff ever receive it.
// ---------------------------------------------------------------------------------------------

import type { trainingAPI } from '@/api/client/training';
import type { Attempt, Question, QuizResult } from './training';

export interface PreviewQuiz {
  stepId: number;
  questions: Question[];
  /** Why there are no questions (an unfinished draft), or null. */
  problem: string | null;
}

export interface PreviewAnswerKey {
  questionVersionId: number;
  correctOptionIds: number[];
  /** Options a logged correction also accepts. */
  acceptedOptionIds: number[];
  critical: boolean;
  /** A correction dropped the question: it is neither scored nor critical. */
  dropped: boolean;
  explanationMarkdown: string | null;
  remediationStepPosition: number | null;
}

export interface PreviewVideo {
  stepId: number;
  url: string | null;
  expiresAt: string | null;
  durationSeconds: number | null;
  /** Set when `url` is null: no file yet, or not in storage. */
  problem: string | null;
}

export interface TrainingPreview {
  attempt: Attempt;
  passMarkPercent: number;
  quizzes: PreviewQuiz[];
  answerKey: PreviewAnswerKey[];
  videos: PreviewVideo[];
}

/** The calls the learner components make. Live mode sends them to the server; preview mode answers them in the browser. */
export type TrainingRuntimeApi = Pick<
  typeof trainingAPI,
  | 'getAttempt'
  | 'acceptPledge'
  | 'abandonAttempt'
  | 'getPlaybackUrl'
  | 'sendHeartbeat'
  | 'answerCheckpoint'
  | 'completeReading'
  | 'acceptAttestation'
  | 'openQuiz'
  | 'saveQuizAnswers'
  | 'submitQuiz'
>;

/** One graded question of a previewed quiz, with what the student would never be shown. */
export interface RevealedQuestion {
  question: Question;
  selected: number[];
  correct: boolean;
  dropped: boolean;
  critical: boolean;
  /** Correct plus any option a correction accepts. */
  correctOptionIds: number[];
  explanationMarkdown: string | null;
}

/** The staff-only review of a submitted preview quiz. */
export interface QuizReveal {
  result: QuizResult;
  questions: RevealedQuestion[];
}

/** What only preview mode offers the player: skipping, restarting, the answer reveal and the way back to the editor. */
export interface PreviewControls {
  /** "Draft, version 3" */
  versionLabel: string;
  /** Where "Back to the editor" goes. */
  exitHref: string;
  /** Marks the current step done without doing it. */
  skipStep: () => void;
  /** Forgets all preview progress (the pledge, every step, every answer). */
  restart: () => void;
  /** The review shown after submitting the quiz of [stepId], or null before that. */
  quizReveal: (stepId: number) => QuizReveal | null;
  /** After a passed quiz: completes the step so the player moves on. */
  finishQuiz: (stepId: number) => void;
  /** Starts the quiz over with no waiting. Draws again from the server when it can. */
  retakeQuiz: (stepId: number) => Promise<void>;
}
