import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { mockServer } from '../mocks';
import { trainingAPI } from './training';
import { endpoints } from './endpoints';
import { getBaseUrl } from './utils';
import { ApiError } from './errors';

const baseUrl = getBaseUrl();
const ok = (data: unknown) => HttpResponse.json({ success: true, data });

/** Records the method, path and JSON body of the next request to [path]. */
function capture(method: 'get' | 'post' | 'put', path: string, data: unknown = {}) {
  const seen: { method?: string; path?: string; body?: unknown } = {};
  mockServer.use(
    http[method](`${baseUrl}${path}`, async ({ request }) => {
      seen.method = request.method;
      seen.path = new URL(request.url).pathname;
      const text = await request.text();
      seen.body = text ? JSON.parse(text) : undefined;
      return ok(data);
    }),
  );
  return seen;
}

describe('trainingAPI (learner contract)', () => {
  it('lists my trainings', async () => {
    const seen = capture('get', '/api/v1/training/trainings', {
      orientationComplete: false,
      trainings: [],
    });
    expect(await trainingAPI.getMyTrainings()).toEqual({
      orientationComplete: false,
      trainings: [],
    });
    expect(seen.method).toBe('GET');
  });

  it('starts an attempt without a body', async () => {
    const seen = capture('post', '/api/v1/training/trainings/maker-orientation/attempts', {
      attemptId: 5,
    });
    await trainingAPI.startAttempt('maker-orientation');
    expect(seen.method).toBe('POST');
    expect(seen.body).toBeUndefined();
  });

  it('reads, pledges for and abandons an attempt', async () => {
    const get = capture('get', '/api/v1/training/attempts/5', { attemptId: 5 });
    const pledge = capture('post', '/api/v1/training/attempts/5/pledge', { attemptId: 5 });
    const abandon = capture('post', '/api/v1/training/attempts/5/abandon', { attemptId: 5 });

    await trainingAPI.getAttempt(5);
    await trainingAPI.acceptPledge(5);
    await trainingAPI.abandonAttempt(5);

    expect(get.method).toBe('GET');
    expect(pledge.method).toBe('POST');
    expect(abandon.method).toBe('POST');
  });

  it('asks for a playback URL', async () => {
    const seen = capture('post', '/api/v1/training/attempts/5/steps/7/video/playback-url', {
      url: 'https://x/y.mp4',
      expiresAt: '2026-10-20T13:00:00Z',
      durationSeconds: 90,
    });
    expect((await trainingAPI.getPlaybackUrl(5, 7)).url).toBe('https://x/y.mp4');
    expect(seen.method).toBe('POST');
  });

  it('sends a heartbeat as {ranges, focusLossCount}', async () => {
    const seen = capture('post', '/api/v1/training/attempts/5/steps/7/video/heartbeat', {
      watchedPercent: 12,
    });
    await trainingAPI.sendHeartbeat(5, 7, {
      ranges: [{ start: 0, end: 9.5 }],
      focusLossCount: 2,
    });
    expect(seen.body).toEqual({ ranges: [{ start: 0, end: 9.5 }], focusLossCount: 2 });
  });

  it('answers a checkpoint with {optionIds}', async () => {
    const seen = capture(
      'post',
      '/api/v1/training/attempts/5/steps/7/video/checkpoints/11/answer',
      { correct: true },
    );
    await trainingAPI.answerCheckpoint(5, 7, 11, [3]);
    expect(seen.body).toEqual({ optionIds: [3] });
  });

  it('completes a reading with the dwell time and the gate answer', async () => {
    const seen = capture('post', '/api/v1/training/attempts/5/steps/8/reading/complete', {
      stepCompleted: true,
    });
    await trainingAPI.completeReading(5, 8, { dwellSeconds: 40, optionIds: [2] });
    expect(seen.body).toEqual({ dwellSeconds: 40, optionIds: [2] });
  });

  it('accepts an attestation with {accepted: true}', async () => {
    const seen = capture('post', '/api/v1/training/attempts/5/steps/9/attestation/accept', {
      stepCompleted: true,
    });
    await trainingAPI.acceptAttestation(5, 9);
    expect(seen.body).toEqual({ accepted: true });
  });

  it('opens, saves (PUT) and submits a quiz', async () => {
    const open = capture('post', '/api/v1/training/attempts/5/steps/10/quiz/open', {
      stepId: 10,
      questions: [],
    });
    const save = capture('put', '/api/v1/training/attempts/5/steps/10/quiz/answers', {
      stepId: 10,
      questions: [],
    });
    const submit = capture('post', '/api/v1/training/attempts/5/steps/10/quiz/submit', {
      passed: true,
    });
    const answers = [{ questionVersionId: 1, optionIds: [4] }];

    await trainingAPI.openQuiz(5, 10);
    await trainingAPI.saveQuizAnswers(5, 10, answers);
    await trainingAPI.submitQuiz(5, 10, answers);

    expect(open.method).toBe('POST');
    expect(save.method).toBe('PUT');
    expect(save.body).toEqual({ answers });
    expect(submit.body).toEqual({ answers });
  });

  it('submits an already-saved quiz with an empty body', async () => {
    const submit = capture('post', '/api/v1/training/attempts/5/steps/10/quiz/submit', {
      passed: false,
    });
    await trainingAPI.submitQuiz(5, 10);
    expect(submit.body).toEqual({});
  });

  it('lists and accepts agreements', async () => {
    const pending = capture('get', endpoints.training.pendingAgreements, []);
    const accept = capture('post', '/api/v1/training/agreements/3/accept', { agreementId: 3 });

    expect(await trainingAPI.getPendingAgreements()).toEqual([]);
    await trainingAPI.acceptAgreement(3);

    expect(pending.method).toBe('GET');
    expect(accept.method).toBe('POST');
  });

  it('throws an ApiError carrying the code and details', async () => {
    mockServer.use(
      http.post(`${baseUrl}/api/v1/training/trainings/laser/attempts`, () =>
        HttpResponse.json(
          {
            success: false,
            error: {
              code: 'ATTEMPT_ALREADY_IN_PROGRESS',
              message: 'x',
              details: { attemptId: 99 },
            },
          },
          { status: 409 },
        ),
      ),
    );

    const error = await trainingAPI.startAttempt('laser').catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe('ATTEMPT_ALREADY_IN_PROGRESS');
    expect(error.details).toEqual({ attemptId: 99 });
  });
});
