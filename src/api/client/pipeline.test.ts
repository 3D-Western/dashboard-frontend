import { describe, it, expect, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { mockServer } from '../mocks';
import { ApiError } from './errors';
import { endpoints } from './endpoints';
import {
  LiveViewFrameError,
  PlanChangedError,
  isLiveViewEnded,
  liveViewRelayUrl,
  createSseParser,
  isConflictError,
  unratedPrintsOf,
  pipelineApi,
  planFromConflictBody,
  type SseFrame,
} from './pipeline';
import {
  createMockEvent,
  createMockPlan,
  createMockSnapshot,
  createMockStep,
  sseBody,
  sseResponse,
} from '@test/utils/pipelineFactories';
import type { PipelineStreamEvent } from '@/types/pipeline';

const JOB = 'job-42';

describe('pipelineApi', () => {
  describe('getState', () => {
    it('returns the snapshot out of the ApiResponse wrapper', async () => {
      const snapshot = createMockSnapshot({
        studentStatus: 'needs_confirmation',
        plan: createMockPlan(),
        steps: [createMockStep()],
      });
      mockServer.use(
        http.get(endpoints.pipeline.state(JOB), () =>
          HttpResponse.json({ success: true, data: snapshot }),
        ),
      );

      await expect(pipelineApi.getState(JOB)).resolves.toEqual(snapshot);
    });

    it('turns an error response into an ApiError with its code', async () => {
      mockServer.use(
        http.get(endpoints.pipeline.state(JOB), () =>
          HttpResponse.json(
            { success: false, error: { code: 'JOB_NOT_FOUND', message: 'No such job' } },
            { status: 404 },
          ),
        ),
      );

      await expect(pipelineApi.getState(JOB)).rejects.toMatchObject({
        name: 'ApiError',
        code: 'JOB_NOT_FOUND',
      });
    });
  });

  describe('saveInputs', () => {
    it('posts the student inputs in the contract shape', async () => {
      const received = vi.fn();
      mockServer.use(
        http.post(endpoints.pipeline.inputs(JOB), async ({ request }) => {
          received(await request.json());
          return HttpResponse.json({ success: true, data: null }, { status: 202 });
        }),
      );

      await pipelineApi.saveInputs(JOB, {
        purpose: 'class',
        purposeDetails: { course: 'MME 4499' },
        description: 'A gear for my robot arm',
        settings: { profile: 'strong', infillPercent: 40, supports: 'auto', brim: 'on' },
      });

      expect(received).toHaveBeenCalledWith({
        purpose: 'class',
        purposeDetails: { course: 'MME 4499' },
        description: 'A gear for my robot arm',
        settings: { profile: 'strong', infillPercent: 40, supports: 'auto', brim: 'on' },
      });
    });
  });

  describe('saveInputs on a closed job', () => {
    it('reports a 409 as a plain conflict, never as a changed plan', async () => {
      mockServer.use(
        http.post(endpoints.pipeline.inputs(JOB), () =>
          HttpResponse.json(
            { success: false, error: { code: 'CONFLICT', message: 'The job is closed' } },
            { status: 409 },
          ),
        ),
      );

      const error = await pipelineApi.saveInputs(JOB, { description: 'x' }).catch((e) => e);

      expect(error).not.toBeInstanceOf(PlanChangedError);
      expect(isConflictError(error)).toBe(true);
    });
  });

  describe('after the print: collected, rating, quality, follow-ups', () => {
    const conflict = (message: string) =>
      HttpResponse.json(
        { success: false, data: null, error: { code: 'CONFLICT', message } },
        { status: 409 },
      );

    it('rate sends up or down and returns the job’s updated student view', async () => {
      const received = vi.fn();
      const view = createMockSnapshot({ studentStatus: 'collected', ratingPending: false });
      mockServer.use(
        http.post(endpoints.pipeline.rating(JOB), async ({ request }) => {
          received(await request.json());
          return HttpResponse.json({ success: true, data: view }, { status: 202 });
        }),
      );

      await expect(pipelineApi.rate(JOB, 'down')).resolves.toEqual(view);
      expect(received).toHaveBeenCalledWith({ rating: 'down' });
    });

    it('rate reports a different second rating (409) as a conflict', async () => {
      mockServer.use(
        http.post(endpoints.pipeline.rating(JOB), () => conflict('This print was already rated.')),
      );

      const error = await pipelineApi.rate(JOB, 'up').catch((e: unknown) => e);

      expect(isConflictError(error)).toBe(true);
    });

    it('reportQuality sends the reasons and trims the words, leaving them out when empty', async () => {
      const received = vi.fn();
      mockServer.use(
        http.post(endpoints.pipeline.quality(JOB), async ({ request }) => {
          received(await request.json());
          return HttpResponse.json({ success: true, data: null }, { status: 202 });
        }),
      );

      await pipelineApi.reportQuality(JOB, { reasons: ['warping', 'weak'], text: '  curled up  ' });
      await pipelineApi.reportQuality(JOB, { reasons: ['other'], text: '   ' });

      expect(received).toHaveBeenNthCalledWith(1, {
        reasons: ['warping', 'weak'],
        text: 'curled up',
      });
      expect(received).toHaveBeenNthCalledWith(2, { reasons: ['other'] });
    });

    it('answerFollowup posts the answer to the question id in the path', async () => {
      const received = vi.fn();
      mockServer.use(
        http.post(endpoints.pipeline.followup(JOB, 7), async ({ request }) => {
          received(await request.json());
          return HttpResponse.json({ success: true, data: null }, { status: 202 });
        }),
      );

      await pipelineApi.answerFollowup(JOB, 7, 'unsure');

      expect(received).toHaveBeenCalledWith({ answer: 'unsure' });
    });

    it('answerFollowup reports a second answer (409) as a conflict', async () => {
      mockServer.use(
        http.post(endpoints.pipeline.followup(JOB, 7), () => conflict('Already answered')),
      );

      const error = await pipelineApi.answerFollowup(JOB, 7, 'yes').catch((e: unknown) => e);

      expect(isConflictError(error)).toBe(true);
    });

    it('confirm still reads a 409 as a changed plan', async () => {
      mockServer.use(http.post(endpoints.pipeline.confirm(JOB), () => conflict('plan changed')));

      await expect(pipelineApi.confirm(JOB, 'plan-1')).rejects.toBeInstanceOf(PlanChangedError);
    });
  });

  describe('confirm', () => {
    it('sends the plan id that was shown', async () => {
      const received = vi.fn();
      mockServer.use(
        http.post(endpoints.pipeline.confirm(JOB), async ({ request }) => {
          received(await request.json());
          return HttpResponse.json({ success: true, data: null }, { status: 202 });
        }),
      );

      await pipelineApi.confirm(JOB, 'plan-7');

      expect(received).toHaveBeenCalledWith({ planId: 'plan-7' });
    });

    it('throws PlanChangedError carrying the new plan on a 409', async () => {
      const newPlan = createMockPlan({ planId: 'plan-8' });
      mockServer.use(
        http.post(endpoints.pipeline.confirm(JOB), () =>
          HttpResponse.json(
            {
              success: false,
              data: { plan: newPlan },
              error: { code: 'PLAN_CHANGED', message: 'The plan changed' },
            },
            { status: 409 },
          ),
        ),
      );

      const error = await pipelineApi.confirm(JOB, 'plan-7').catch((e: unknown) => e);

      expect(error).toBeInstanceOf(PlanChangedError);
      expect((error as PlanChangedError).plan).toEqual(newPlan);
    });

    it('still throws PlanChangedError (without a plan) when a 409 carries none', async () => {
      mockServer.use(
        http.post(endpoints.pipeline.confirm(JOB), () =>
          HttpResponse.json({ success: false, error: { code: 'PLAN_CHANGED' } }, { status: 409 }),
        ),
      );

      const error = await pipelineApi.confirm(JOB, 'plan-7').catch((e: unknown) => e);

      expect(error).toBeInstanceOf(PlanChangedError);
      expect((error as PlanChangedError).plan).toBeNull();
    });
  });

  describe('choose and report', () => {
    it('posts a choice with its plan id', async () => {
      const received = vi.fn();
      mockServer.use(
        http.post(endpoints.pipeline.choices(JOB), async ({ request }) => {
          received(await request.json());
          return HttpResponse.json({ success: true, data: null }, { status: 202 });
        }),
      );

      await pipelineApi.choose(JOB, {
        planId: 'plan-1',
        choiceId: 'orientation',
        optionId: 'flat',
      });

      expect(received).toHaveBeenCalledWith({
        planId: 'plan-1',
        choiceId: 'orientation',
        optionId: 'flat',
      });
    });

    it('posts the text of a problem report', async () => {
      const received = vi.fn();
      mockServer.use(
        http.post(endpoints.pipeline.report(JOB), async ({ request }) => {
          received(await request.json());
          return HttpResponse.json({ success: true, data: null }, { status: 202 });
        }),
      );

      await pipelineApi.report(JOB, 'The preview is wrong');

      expect(received).toHaveBeenCalledWith({ text: 'The preview is wrong' });
    });

    it('fails with an ApiError when the network is down', async () => {
      mockServer.use(http.post(endpoints.pipeline.report(JOB), () => HttpResponse.error()));

      await expect(pipelineApi.report(JOB, 'x')).rejects.toBeInstanceOf(ApiError);
    });
  });

  describe('disagree and escalate', () => {
    const answer = {
      requestId: '7c0f8f1e-4b54-4a5a-9d2c-1f3f5f1a9a11',
      turn: 1,
      status: 'rate_limited',
      answer: 'Too many questions.',
      askedAt: '2026-11-05T12:00:00Z',
      retryAfterS: 90,
    };

    it('posts the request id and text and passes a rate_limited 200 through as an answer', async () => {
      const received = vi.fn();
      mockServer.use(
        http.post(endpoints.pipeline.disagree(JOB), async ({ request }) => {
          received(await request.json());
          return HttpResponse.json({ success: true, data: answer });
        }),
      );

      const result = await pipelineApi.disagree(JOB, {
        requestId: answer.requestId,
        text: 'Why supports?',
      });

      expect(result).toEqual(answer);
      expect(received).toHaveBeenCalledWith({
        requestId: answer.requestId,
        text: 'Why supports?',
      });
    });

    it('fails with an ApiError on a network error or an error response', async () => {
      mockServer.use(http.post(endpoints.pipeline.disagree(JOB), () => HttpResponse.error()));
      await expect(
        pipelineApi.disagree(JOB, { requestId: answer.requestId, text: 'x' }),
      ).rejects.toBeInstanceOf(ApiError);

      mockServer.use(
        http.post(endpoints.pipeline.disagree(JOB), () =>
          HttpResponse.json(
            { success: false, error: { code: 'VALIDATION_ERROR', message: 'Too long' } },
            { status: 422 },
          ),
        ),
      );
      await expect(
        pipelineApi.disagree(JOB, { requestId: answer.requestId, text: 'x' }),
      ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    });

    it('escalates with the trimmed words, or with an empty body when there are none', async () => {
      const received = vi.fn();
      mockServer.use(
        http.post(endpoints.pipeline.disagreeEscalate(JOB), async ({ request }) => {
          received(await request.json());
          return HttpResponse.json({ success: true, data: null }, { status: 202 });
        }),
      );

      await pipelineApi.escalateDisagree(JOB, '  still wrong  ');
      await pipelineApi.escalateDisagree(JOB);
      await pipelineApi.escalateDisagree(JOB, '   ');

      expect(received.mock.calls).toEqual([[{ text: 'still wrong' }], [{}], [{}]]);
    });

    it('reports a 409 on escalate as a conflict (already with the crew)', async () => {
      mockServer.use(
        http.post(endpoints.pipeline.disagreeEscalate(JOB), () =>
          HttpResponse.json(
            { success: false, error: { code: 'CONFLICT', message: 'Already escalated' } },
            { status: 409 },
          ),
        ),
      );

      const error = await pipelineApi.escalateDisagree(JOB, 'x').catch((e: unknown) => e);

      expect(error).not.toBeInstanceOf(PlanChangedError);
      expect(isConflictError(error)).toBe(true);
    });
  });

  describe('stream', () => {
    it('delivers each event as it arrives, even when frames are split between chunks', async () => {
      const events = [
        createMockEvent({ seq: 1, step: createMockStep({ state: 'started' }) }),
        createMockEvent({ seq: 2, step: createMockStep({ state: 'done' }) }),
        createMockEvent({
          seq: 3,
          type: 'plan',
          studentStatus: 'needs_confirmation',
          plan: createMockPlan(),
        }),
      ];
      const body = sseBody(events);
      const cut = Math.floor(body.length / 3);
      mockServer.use(
        http.get(endpoints.pipeline.stream(JOB), () =>
          sseResponse([
            `: hello\n\n`,
            body.slice(0, cut),
            body.slice(cut, cut * 2),
            body.slice(cut * 2),
          ]),
        ),
      );
      const received: PipelineStreamEvent[] = [];
      const onOpen = vi.fn();

      await pipelineApi.stream(JOB, { onEvent: (event) => received.push(event), onOpen });

      expect(onOpen).toHaveBeenCalledOnce();
      expect(received).toEqual(events);
    });

    it('asks to resume after the last event it saw', async () => {
      const lastEventId = vi.fn();
      mockServer.use(
        http.get(endpoints.pipeline.stream(JOB), ({ request }) => {
          lastEventId(request.headers.get('Last-Event-ID'));
          return sseResponse([]);
        }),
      );

      await pipelineApi.stream(JOB, { lastSeq: 9, onEvent: vi.fn() });

      expect(lastEventId).toHaveBeenCalledWith('9');
    });

    it('rejects when the server refuses the stream', async () => {
      mockServer.use(
        http.get(endpoints.pipeline.stream(JOB), () => new HttpResponse(null, { status: 502 })),
      );

      await expect(pipelineApi.stream(JOB, { onEvent: vi.fn() })).rejects.toBeInstanceOf(ApiError);
    });

    it('skips a frame that is not an event instead of failing', async () => {
      const good = createMockEvent({ seq: 1 });
      mockServer.use(
        http.get(endpoints.pipeline.stream(JOB), () =>
          sseResponse([`data: not json\n\n`, sseBody([good])]),
        ),
      );
      const received: PipelineStreamEvent[] = [];

      await pipelineApi.stream(JOB, { onEvent: (event) => received.push(event) });

      expect(received).toEqual([good]);
    });
  });
});

describe('createSseParser', () => {
  it('joins multi-line data, reads ids and event names, and ignores comments', () => {
    const frames: SseFrame[] = [];
    const parser = createSseParser((frame) => frames.push(frame));

    parser.push(': keep-alive\n\nid: 4\nevent: step\ndata: {"a":\ndata: 1}\r\n\r\n');

    expect(frames).toEqual([{ id: '4', event: 'step', data: '{"a":\n1}' }]);
  });

  it('waits for the blank line that ends a frame', () => {
    const frames: SseFrame[] = [];
    const parser = createSseParser((frame) => frames.push(frame));

    parser.push('data: one\n');
    expect(frames).toEqual([]);
    parser.push('\n');
    expect(frames).toEqual([{ data: 'one' }]);
  });
});

describe('planFromConflictBody', () => {
  const plan = createMockPlan({ planId: 'plan-9' });

  it('finds the new plan at data.plan, where the contract puts it', () => {
    expect(planFromConflictBody({ success: false, data: { plan } })).toEqual(plan);
  });

  it.each([
    ['data itself', { data: plan }],
    ['error.details.plan', { error: { details: { plan } } }],
    ['the top level', { plan }],
  ])('does not look for it in %s', (_where, body) => {
    expect(planFromConflictBody(body)).toBeNull();
  });

  it('returns null when there is none', () => {
    expect(planFromConflictBody(null)).toBeNull();
    expect(planFromConflictBody({ error: { code: 'PLAN_CHANGED' } })).toBeNull();
  });
});

describe('pendingRatings (rate first look-ahead, P-20)', () => {
  const prints = [{ jobId: 'job-1', name: 'Hinge Pair', collectedAt: '2026-11-01T10:00:00Z' }];

  it('uses the backend path and returns the prints to rate out of the ApiResponse wrapper', async () => {
    expect(endpoints.pipeline.pendingRatings).toBe('/api/v1/jobs/pending-ratings');
    mockServer.use(
      http.get(endpoints.pipeline.pendingRatings, () =>
        HttpResponse.json({ success: true, data: { unratedPrints: prints } }),
      ),
    );

    await expect(pipelineApi.pendingRatings()).resolves.toEqual(prints);
  });

  it('is an empty list when nothing needs rating, or the list is missing or malformed', async () => {
    mockServer.use(
      http.get(endpoints.pipeline.pendingRatings, () =>
        HttpResponse.json({ success: true, data: { unratedPrints: [] } }),
      ),
    );
    await expect(pipelineApi.pendingRatings()).resolves.toEqual([]);

    mockServer.use(
      http.get(endpoints.pipeline.pendingRatings, () =>
        HttpResponse.json({ success: true, data: { unratedPrints: [{ name: 'no id' }, 7] } }),
      ),
    );
    await expect(pipelineApi.pendingRatings()).resolves.toEqual([]);
  });

  it('rejects on an error (429 rate limit, signed out) so the caller can fall back to the 409', async () => {
    mockServer.use(
      http.get(endpoints.pipeline.pendingRatings, () =>
        HttpResponse.json(
          {
            success: false,
            data: null,
            error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Slow down' },
          },
          { status: 429 },
        ),
      ),
    );

    await expect(pipelineApi.pendingRatings()).rejects.toBeInstanceOf(ApiError);
  });
});

describe('unratedPrintsOf (rate first, P-20)', () => {
  const prints = [{ jobId: 'job-1', name: 'Hinge Pair', collectedAt: '2026-11-01T10:00:00Z' }];

  it('reads the prints to rate from the 409 RATING_REQUIRED that create-job answers', async () => {
    mockServer.use(
      http.post(endpoints.jobs.create, () =>
        HttpResponse.json(
          {
            success: false,
            data: { unratedPrints: prints },
            error: { code: 'RATING_REQUIRED', message: 'Please rate your previous print' },
          },
          { status: 409 },
        ),
      ),
    );
    const { jobApi } = await import('./job');

    const error = await jobApi
      .createJob({ jobName: 'x', category: 'ThreeDPrint', formAnswerJson: '{}' } as never)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(unratedPrintsOf(error)).toEqual(prints);
  });

  it('is null for any other error, and empty when the list is missing', () => {
    expect(unratedPrintsOf(new ApiError('CONFLICT', 'x'))).toBeNull();
    expect(unratedPrintsOf(new Error('x'))).toBeNull();
    expect(unratedPrintsOf(new ApiError('RATING_REQUIRED', 'x'))).toEqual([]);
    expect(unratedPrintsOf(new ApiError('RATING_REQUIRED', 'x', undefined, undefined, {}))).toEqual(
      [],
    );
  });
});

describe('the live view (P-100)', () => {
  const OFFER = {
    available: true,
    snapshotUrl: `/api/v1/jobs/${JOB}/pipeline/live-view/snapshot`,
    streamUrl: `/api/v1/jobs/${JOB}/pipeline/live-view/stream`,
    expiresAt: '2026-11-06T12:02:00Z',
    maxStreamS: 90,
    snapshotIntervalS: 1,
  };

  it('asks for the offer at the job’s live view route and returns it from the wrapper', async () => {
    expect(endpoints.pipeline.liveView(JOB)).toBe(`/api/v1/jobs/${JOB}/pipeline/live-view`);
    mockServer.use(
      http.get(endpoints.pipeline.liveView(JOB), () =>
        HttpResponse.json({ success: true, data: OFFER }),
      ),
    );

    await expect(pipelineApi.liveView(JOB)).resolves.toEqual(OFFER);
  });

  it('passes the reason when there is no view', async () => {
    mockServer.use(
      http.get(endpoints.pipeline.liveView(JOB), () =>
        HttpResponse.json({ success: true, data: { available: false, reason: 'not_printing' } }),
      ),
    );

    await expect(pipelineApi.liveView(JOB)).resolves.toEqual({
      available: false,
      reason: 'not_printing',
    });
  });

  it('turns a 410 into an error the viewer reads as "the print has finished"', async () => {
    mockServer.use(
      http.get(endpoints.pipeline.liveView(JOB), () =>
        HttpResponse.json(
          { success: false, error: { code: 'LIVE_VIEW_ENDED', message: 'The print has finished' } },
          { status: 410 },
        ),
      ),
    );

    const error = await pipelineApi.liveView(JOB).catch((e: unknown) => e);

    expect(isLiveViewEnded(error)).toBe(true);
    expect(isLiveViewEnded(new Error('x'))).toBe(false);
  });

  it('a 409 on the offer is a plain error, never a plan change', async () => {
    mockServer.use(
      http.get(endpoints.pipeline.liveView(JOB), () =>
        HttpResponse.json(
          { success: false, error: { code: 'CONFLICT', message: 'no' } },
          { status: 409 },
        ),
      ),
    );

    await expect(pipelineApi.liveView(JOB)).rejects.not.toBeInstanceOf(PlanChangedError);
  });

  it('only accepts the job’s own relay routes as addresses to load pictures from', () => {
    expect(liveViewRelayUrl(JOB, OFFER.streamUrl)).toBe(OFFER.streamUrl);
    expect(liveViewRelayUrl(JOB, OFFER.snapshotUrl)).toBe(OFFER.snapshotUrl);
    for (const url of [
      null,
      undefined,
      '',
      'https://camera.example/stream',
      '//camera.example/stream',
      '/api/v1/jobs/other-job/pipeline/live-view/stream',
      `/api/v1/jobs/${JOB}/pipeline/live-view/stream/../../x`,
      `/api/v1/jobs/${JOB}/pipeline/live-view/stream?x=1`,
      `/api/v1/jobs/${JOB}/pipeline/live-view/other`,
    ]) {
      expect(liveViewRelayUrl(JOB, url)).toBeNull();
    }
  });

  describe('liveViewFrame', () => {
    const frame = () =>
      new HttpResponse(new Uint8Array([1, 2, 3]), { headers: { 'Content-Type': 'image/jpeg' } });

    it('returns the picture as a blob', async () => {
      mockServer.use(http.get(OFFER.snapshotUrl, () => frame()));

      const blob = await pipelineApi.liveViewFrame(OFFER.snapshotUrl);

      expect(blob.size).toBe(3);
    });

    it.each([
      [410, 'ended'],
      [429, 'too-often'],
      [403, 'forbidden'],
      [404, 'forbidden'],
      [503, 'unavailable'],
      [500, 'failed'],
    ])('says why there is no picture on a %i', async (status, reason) => {
      mockServer.use(http.get(OFFER.snapshotUrl, () => new HttpResponse(null, { status })));

      const error = await pipelineApi.liveViewFrame(OFFER.snapshotUrl).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(LiveViewFrameError);
      expect((error as LiveViewFrameError).reason).toBe(reason);
    });

    it('a network failure is a failed picture, not a crash', async () => {
      mockServer.use(http.get(OFFER.snapshotUrl, () => HttpResponse.error()));

      const error = await pipelineApi.liveViewFrame(OFFER.snapshotUrl).catch((e: unknown) => e);

      expect((error as LiveViewFrameError).reason).toBe('failed');
    });
  });
});
