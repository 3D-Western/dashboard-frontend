import { ApiError, ErrorCodes } from './errors';
import { formatWhen } from '@/lib/training-format';

/** Every error code in the learner training contract (docs/plans/training-v1.md). */
export const TrainingErrorCodes = {
  TRAINING_NOT_FOUND: 'TRAINING_NOT_FOUND',
  ATTEMPT_NOT_FOUND: 'ATTEMPT_NOT_FOUND',
  STEP_NOT_FOUND: 'STEP_NOT_FOUND',
  CHECKPOINT_NOT_FOUND: 'CHECKPOINT_NOT_FOUND',
  AGREEMENT_NOT_FOUND: 'AGREEMENT_NOT_FOUND',
  ATTEMPT_ALREADY_IN_PROGRESS: 'ATTEMPT_ALREADY_IN_PROGRESS',
  ALREADY_CERTIFIED: 'ALREADY_CERTIFIED',
  AWAITING_SIGNOFF: 'AWAITING_SIGNOFF',
  CERTIFICATION_REVOKED: 'CERTIFICATION_REVOKED',
  CERTIFICATION_CHANGED: 'CERTIFICATION_CHANGED',
  TRAINING_NOT_AVAILABLE: 'TRAINING_NOT_AVAILABLE',
  NO_STEPS_TO_TAKE: 'NO_STEPS_TO_TAKE',
  ATTEMPT_LIMIT_REACHED: 'ATTEMPT_LIMIT_REACHED',
  ATTEMPT_NOT_IN_PROGRESS: 'ATTEMPT_NOT_IN_PROGRESS',
  PLEDGE_REQUIRED: 'PLEDGE_REQUIRED',
  STEP_LOCKED: 'STEP_LOCKED',
  STEP_ALREADY_COMPLETED: 'STEP_ALREADY_COMPLETED',
  VIDEO_NOT_CONFIGURED: 'VIDEO_NOT_CONFIGURED',
  QUIZ_NOT_OPENED: 'QUIZ_NOT_OPENED',
  AGREEMENT_SUPERSEDED: 'AGREEMENT_SUPERSEDED',
  RETRY_COOLDOWN: 'RETRY_COOLDOWN',
  WRONG_STEP_TYPE: 'WRONG_STEP_TYPE',
  INVALID_ANSWER: 'INVALID_ANSWER',
  QUIZ_INCOMPLETE: 'QUIZ_INCOMPLETE',
  ATTESTATION_NOT_ACCEPTED: 'ATTESTATION_NOT_ACCEPTED',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  ORIENTATION_REQUIRED: 'ORIENTATION_REQUIRED',
} as const;

function detailsOf(error: ApiError): Record<string, unknown> {
  return typeof error.details === 'object' && error.details !== null
    ? (error.details as Record<string, unknown>)
    : {};
}

/**
 * Why a training row is blocked, in plain words. `blockedReason` on a row is the error code the
 * start endpoint would answer with, so it shares the wording of [trainingErrorMessage].
 */
export function blockedMessage(
  training: { blockedReason: string | null; retryAt: string | null },
  now: Date = new Date(),
): string {
  const code = training.blockedReason ?? TrainingErrorCodes.TRAINING_NOT_AVAILABLE;
  return trainingErrorMessage(
    new ApiError(code, undefined, { retryAt: training.retryAt }),
    "You can't start this training right now.",
    now,
  );
}

/** The attempt id the server wants us to resume (`ATTEMPT_ALREADY_IN_PROGRESS`), if it sent one. */
export function attemptIdFromError(error: unknown): number | null {
  if (!(error instanceof ApiError)) return null;
  const id = detailsOf(error).attemptId;
  return typeof id === 'number' ? id : null;
}

/**
 * Plain-language text for a training API failure. The server's own messages are written for
 * developers, so every code in the contract gets wording for students; anything else falls back
 * to [fallback].
 */
export function trainingErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
  now: Date = new Date(),
): string {
  if (!(error instanceof ApiError)) return fallback;

  const details = detailsOf(error);
  switch (error.code) {
    case TrainingErrorCodes.RETRY_COOLDOWN: {
      const retryAt = typeof details.retryAt === 'string' ? details.retryAt : null;
      return retryAt
        ? `You can try this training again ${formatWhen(retryAt, now)}. Use the time to review the material.`
        : 'You need to wait a little before trying this training again.';
    }
    case TrainingErrorCodes.ATTEMPT_LIMIT_REACHED:
      return "You've used all your attempts for this training. Please speak to a supervisor at the makerspace.";
    case TrainingErrorCodes.AWAITING_SIGNOFF:
      return "You've finished the online part. A supervisor still needs to sign you off in person.";
    case TrainingErrorCodes.ALREADY_CERTIFIED:
      return "You're already certified for this training.";
    case TrainingErrorCodes.CERTIFICATION_REVOKED:
      return 'This certification was revoked. Please speak to a supervisor.';
    case TrainingErrorCodes.CERTIFICATION_CHANGED:
      return 'Your certification changed while you were working. Please speak to a supervisor.';
    case TrainingErrorCodes.TRAINING_NOT_AVAILABLE:
      return "This training isn't available right now.";
    case TrainingErrorCodes.NO_STEPS_TO_TAKE:
      return "There's nothing new for you to complete in this training.";
    case TrainingErrorCodes.ATTEMPT_ALREADY_IN_PROGRESS:
      return 'You already have an attempt in progress. Continue it instead of starting a new one.';
    case TrainingErrorCodes.ATTEMPT_NOT_IN_PROGRESS:
      return 'This attempt has already finished.';
    case TrainingErrorCodes.PLEDGE_REQUIRED:
      return 'Please accept the honour pledge to begin.';
    case TrainingErrorCodes.STEP_LOCKED:
      return 'Finish the earlier steps first.';
    case TrainingErrorCodes.STEP_ALREADY_COMPLETED:
      return "You've already completed this step.";
    case TrainingErrorCodes.VIDEO_NOT_CONFIGURED:
      return "This video isn't ready yet. Please tell makerspace staff.";
    case TrainingErrorCodes.QUIZ_NOT_OPENED:
      return 'Open the quiz before answering its questions.';
    case TrainingErrorCodes.QUIZ_INCOMPLETE: {
      const unanswered = details.unanswered;
      const count = Array.isArray(unanswered) ? unanswered.length : null;
      return count
        ? `Answer every question before submitting. ${count} ${count === 1 ? 'question is' : 'questions are'} still blank.`
        : 'Answer every question before submitting.';
    }
    case TrainingErrorCodes.INVALID_ANSWER:
      return "That answer wasn't accepted. Choose from the options shown.";
    case TrainingErrorCodes.ATTESTATION_NOT_ACCEPTED:
      return 'Tick the box to confirm before continuing.';
    case TrainingErrorCodes.WRONG_STEP_TYPE:
      return 'That action does not match this step. Reload the page and try again.';
    case TrainingErrorCodes.ORIENTATION_REQUIRED:
      return 'Finish Maker Orientation to submit prints.';
    case TrainingErrorCodes.VALIDATION_FAILED:
      return 'Something in that request was not valid. Reload the page and try again.';
    case TrainingErrorCodes.AGREEMENT_SUPERSEDED:
      return 'A newer version of this agreement was published. Reload the page to read it.';
    case TrainingErrorCodes.TRAINING_NOT_FOUND:
      return "We couldn't find that training.";
    case TrainingErrorCodes.ATTEMPT_NOT_FOUND:
      return "We couldn't find that attempt. It may belong to someone else, or it may have been removed.";
    case TrainingErrorCodes.STEP_NOT_FOUND:
    case TrainingErrorCodes.CHECKPOINT_NOT_FOUND:
      return "We couldn't find that part of the training. Reload the page and try again.";
    case TrainingErrorCodes.AGREEMENT_NOT_FOUND:
      return "We couldn't find that agreement. Reload the page and try again.";
    case ErrorCodes.REQUEST_FAILED:
      return "We couldn't reach the server. Check your connection and try again.";
    case ErrorCodes.SESSION_INVALID:
    case ErrorCodes.SESSION_EXPIRED:
      return 'Your session has expired. Please sign in again.';
    default:
      return fallback;
  }
}
