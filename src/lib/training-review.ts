import { trainingAPI } from '@/api/client/training';
import type { TrainingRuntimeApi } from '@/types/training-preview';

/** Review shows no questions and records nothing, so these calls are never made. If one ever is, it fails loudly. */
const notWhileReviewing = (): Promise<never> =>
  Promise.reject(new Error('That action is not available while reviewing.'));

/**
 * The calls the learner components make, in review mode (a student looking back over a failed
 * attempt): the material comes from the read-only review endpoints, and every call that would
 * record something is refused.
 */
export const reviewRuntimeApi: TrainingRuntimeApi = {
  getAttempt: (attemptId) => trainingAPI.getReviewAttempt(attemptId),
  getPlaybackUrl: (attemptId, stepId) => trainingAPI.getReviewPlaybackUrl(attemptId, stepId),
  acceptPledge: notWhileReviewing,
  abandonAttempt: notWhileReviewing,
  sendHeartbeat: notWhileReviewing,
  answerCheckpoint: notWhileReviewing,
  completeReading: notWhileReviewing,
  acceptAttestation: notWhileReviewing,
  openQuiz: notWhileReviewing,
  saveQuizAnswers: notWhileReviewing,
  submitQuiz: notWhileReviewing,
};
