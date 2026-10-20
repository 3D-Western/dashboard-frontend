import { endpoints } from './endpoints';
import { getBaseUrl } from './utils';
import { apiRequest } from './base';
import type {
  Agreement,
  Attempt,
  CheckpointAnswerResult,
  HeartbeatBody,
  HeartbeatResult,
  MyTrainings,
  Quiz,
  QuizAnswer,
  QuizResult,
  ReadingCompleteResult,
  StepCompletedResult,
  VideoPlayback,
} from '@/types/training';

const get = <T>(path: string, options?: RequestInit) =>
  apiRequest<T>(`${getBaseUrl()}${path}`, { method: 'GET', credentials: 'include', ...options });

const send = <T>(method: 'POST' | 'PUT', path: string, body?: unknown, options?: RequestInit) =>
  apiRequest<T>(`${getBaseUrl()}${path}`, {
    method,
    credentials: 'include',
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    ...options,
  });

export const trainingAPI = {
  // ---- Trainings and attempts ----

  /** My trainings with status and next action, plus whether orientation is complete. */
  getMyTrainings: (options?: RequestInit) => get<MyTrainings>(endpoints.training.list, options),

  /** Start an attempt. The server decides the kind (full, add-on or refresher). */
  startAttempt: (slug: string, options?: RequestInit) =>
    send<Attempt>('POST', endpoints.training.start(slug), undefined, options),

  getAttempt: (attemptId: number, options?: RequestInit) =>
    get<Attempt>(endpoints.training.attempt(attemptId), options),

  acceptPledge: (attemptId: number, options?: RequestInit) =>
    send<Attempt>('POST', endpoints.training.pledge(attemptId), undefined, options),

  abandonAttempt: (attemptId: number, options?: RequestInit) =>
    send<Attempt>('POST', endpoints.training.abandon(attemptId), undefined, options),

  // ---- Steps ----

  /** A presigned video URL. Call it again when the URL has expired. */
  getPlaybackUrl: (attemptId: number, stepId: number) =>
    send<VideoPlayback>('POST', `${endpoints.training.step(attemptId, stepId)}/video/playback-url`),

  /** Pass `{ keepalive: true }` when the page may be closing, so the request survives it. */
  sendHeartbeat: (attemptId: number, stepId: number, body: HeartbeatBody, options?: RequestInit) =>
    send<HeartbeatResult>(
      'POST',
      `${endpoints.training.step(attemptId, stepId)}/video/heartbeat`,
      body,
      options,
    ),

  answerCheckpoint: (
    attemptId: number,
    stepId: number,
    checkpointId: number,
    optionIds: number[],
  ) =>
    send<CheckpointAnswerResult>(
      'POST',
      `${endpoints.training.step(attemptId, stepId)}/video/checkpoints/${checkpointId}/answer`,
      { optionIds },
    ),

  completeReading: (
    attemptId: number,
    stepId: number,
    body: { dwellSeconds: number; optionIds?: number[] },
  ) =>
    send<ReadingCompleteResult>(
      'POST',
      `${endpoints.training.step(attemptId, stepId)}/reading/complete`,
      body,
    ),

  acceptAttestation: (attemptId: number, stepId: number) =>
    send<StepCompletedResult>(
      'POST',
      `${endpoints.training.step(attemptId, stepId)}/attestation/accept`,
      { accepted: true },
    ),

  openQuiz: (attemptId: number, stepId: number) =>
    send<Quiz>('POST', `${endpoints.training.step(attemptId, stepId)}/quiz/open`),

  /** Save answers without grading, so the learner can leave and resume. */
  saveQuizAnswers: (attemptId: number, stepId: number, answers: QuizAnswer[]) =>
    send<Quiz>('PUT', `${endpoints.training.step(attemptId, stepId)}/quiz/answers`, { answers }),

  submitQuiz: (attemptId: number, stepId: number, answers?: QuizAnswer[]) =>
    send<QuizResult>(
      'POST',
      `${endpoints.training.step(attemptId, stepId)}/quiz/submit`,
      answers ? { answers } : {},
    ),

  // ---- Agreements ----

  getPendingAgreements: (options?: RequestInit) =>
    get<Agreement[]>(endpoints.training.pendingAgreements, options),

  acceptAgreement: (agreementId: number) =>
    send<{ agreementId: number; acceptedAt: string }>(
      'POST',
      endpoints.training.acceptAgreement(agreementId),
    ),
};
