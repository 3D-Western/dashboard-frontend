import { describe, it, expect } from 'vitest';
import { ApiError } from './errors';
import {
  TrainingErrorCodes,
  attemptIdFromError,
  blockedMessage,
  trainingErrorMessage,
} from './training-errors';

const NOW = new Date('2026-10-20T12:00:00Z');
const at = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000).toISOString();

describe('trainingErrorMessage', () => {
  it('gives every error code in the contract plain wording, not the raw code', () => {
    for (const code of Object.values(TrainingErrorCodes)) {
      const message = trainingErrorMessage(new ApiError(code, 'server text'), 'FALLBACK', NOW);
      expect(message, code).not.toBe('FALLBACK');
      expect(message, code).not.toBe(code);
      expect(message, code).not.toMatch(/^[A-Z_]+$/);
    }
  });

  it('says how long is left on a cooldown', () => {
    const message = trainingErrorMessage(
      new ApiError('RETRY_COOLDOWN', 'x', { retryAt: at(45) }),
      undefined,
      NOW,
    );
    expect(message).toMatch(/try this training again in 45 minutes/i);
  });

  it('uses hours for a longer cooldown', () => {
    const message = trainingErrorMessage(
      new ApiError('RETRY_COOLDOWN', 'x', { retryAt: at(180) }),
      undefined,
      NOW,
    );
    expect(message).toMatch(/in 3 hours/i);
  });

  it('copes with a cooldown that has no time', () => {
    expect(trainingErrorMessage(new ApiError('RETRY_COOLDOWN'), undefined, NOW)).toMatch(/wait/i);
  });

  it('explains the attempt limit', () => {
    expect(trainingErrorMessage(new ApiError('ATTEMPT_LIMIT_REACHED'))).toMatch(
      /used all your attempts.*supervisor/i,
    );
  });

  it('explains awaiting sign-off', () => {
    expect(trainingErrorMessage(new ApiError('AWAITING_SIGNOFF'))).toMatch(
      /supervisor still needs to sign you off/i,
    );
  });

  it('counts the unanswered questions on an incomplete quiz', () => {
    expect(
      trainingErrorMessage(new ApiError('QUIZ_INCOMPLETE', 'x', { unanswered: [1, 2, 3] })),
    ).toMatch(/3 questions are still blank/i);
    expect(trainingErrorMessage(new ApiError('QUIZ_INCOMPLETE', 'x', { unanswered: [1] }))).toMatch(
      /1 question is still blank/i,
    );
    expect(trainingErrorMessage(new ApiError('QUIZ_INCOMPLETE'))).toMatch(/answer every question/i);
  });

  it('handles a network failure and an expired session', () => {
    expect(trainingErrorMessage(new ApiError('REQUEST_FAILED'))).toMatch(/connection/i);
    expect(trainingErrorMessage(new ApiError('SESSION_EXPIRED'))).toMatch(/sign in again/i);
  });

  it('falls back for codes it does not know and for non-API errors', () => {
    expect(trainingErrorMessage(new ApiError('SOMETHING_NEW'), 'Custom fallback')).toBe(
      'Custom fallback',
    );
    expect(trainingErrorMessage(new Error('boom'), 'Custom fallback')).toBe('Custom fallback');
    expect(trainingErrorMessage('nope')).toMatch(/something went wrong/i);
  });
});

describe('attemptIdFromError', () => {
  it('reads the attempt to resume from ATTEMPT_ALREADY_IN_PROGRESS', () => {
    expect(
      attemptIdFromError(new ApiError('ATTEMPT_ALREADY_IN_PROGRESS', 'x', { attemptId: 12 })),
    ).toBe(12);
  });

  it('returns null when there is none', () => {
    expect(attemptIdFromError(new ApiError('ATTEMPT_ALREADY_IN_PROGRESS'))).toBeNull();
    expect(attemptIdFromError(new Error('x'))).toBeNull();
  });
});

describe('blockedMessage', () => {
  it('explains a cooldown with time left', () => {
    expect(blockedMessage({ blockedReason: 'RETRY_COOLDOWN', retryAt: at(20) }, NOW)).toMatch(
      /in 20 minutes/i,
    );
  });

  it('explains a revoked certification and the attempt limit', () => {
    expect(blockedMessage({ blockedReason: 'CERTIFICATION_REVOKED', retryAt: null })).toMatch(
      /revoked/i,
    );
    expect(blockedMessage({ blockedReason: 'ATTEMPT_LIMIT_REACHED', retryAt: null })).toMatch(
      /used all your attempts/i,
    );
  });

  it('has wording even without a reason', () => {
    expect(blockedMessage({ blockedReason: null, retryAt: null })).toMatch(/isn't available/i);
  });
});
