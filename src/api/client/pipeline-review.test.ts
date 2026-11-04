import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { mockServer } from '@/api/mocks';
import { ApiError } from './errors';
import { pipelineReviewApi } from './pipeline-review';

interface Seen {
  method: string;
  url: URL;
  headers: Headers;
  body: string;
}

let seen: Seen[] = [];

function answer(data: unknown = null, init: { status?: number; error?: object } = {}) {
  mockServer.use(
    http.all('*/api/v1/*', async ({ request }) => {
      seen.push({
        method: request.method,
        url: new URL(request.url),
        headers: request.headers,
        body: await request.text(),
      });
      return HttpResponse.json(
        init.error ? { success: false, data: null, error: init.error } : { success: true, data },
        { status: init.status ?? 200 },
      );
    }),
  );
}

const JOB_ID = '11111111-1111-4111-8111-000000000001';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

beforeEach(() => {
  seen = [];
});

describe('pipelineReviewApi queue and job', () => {
  it('lists the queue with no query string by default', async () => {
    answer({ items: [], counts: {}, openReports: 0, failedDecisions: [] });
    await pipelineReviewApi.queue();

    expect(seen).toHaveLength(1);
    expect(seen[0].method).toBe('GET');
    expect(seen[0].url.pathname).toBe('/api/v1/admin/pipeline/review/queue');
    expect(seen[0].url.search).toBe('');
  });

  it('sends the statuses, reports flag and limit of a query', async () => {
    answer({ items: [], counts: {}, openReports: 0 });
    await pipelineReviewApi.queue({ status: ['held', 'escalated'], reports: false, limit: 20 });

    expect(seen[0].url.pathname).toBe('/api/v1/admin/pipeline/review/queue');
    expect(seen[0].url.searchParams.get('status')).toBe('held,escalated');
    expect(seen[0].url.searchParams.get('reports')).toBe('false');
    expect(seen[0].url.searchParams.get('limit')).toBe('20');
  });

  it('fetches one job view by id', async () => {
    answer({ jobId: JOB_ID, findings: [], events: [], decisions: [], reports: [] });
    await pipelineReviewApi.job(JOB_ID);

    expect(seen[0].method).toBe('GET');
    expect(seen[0].url.pathname).toBe(`/api/v1/admin/pipeline/review/jobs/${JOB_ID}`);
    expect(seen[0].body).toBe('');
  });
});

describe('pipelineReviewApi decide', () => {
  it('posts a release with the given Idempotency-Key and exactly the decision body', async () => {
    answer({ actionId: 'a', decision: 'release', delivery: 'SENT' });
    await pipelineReviewApi.decide(
      JOB_ID,
      { decision: 'release', reason: 'ok', codes: ['a.b'] },
      'key-1',
    );

    expect(seen[0].method).toBe('POST');
    expect(seen[0].url.pathname).toBe(`/api/v1/admin/pipeline/review/jobs/${JOB_ID}/decisions`);
    expect(seen[0].headers.get('Idempotency-Key')).toBe('key-1');
    expect(seen[0].headers.get('Content-Type')).toBe('application/json');
    expect(JSON.parse(seen[0].body)).toEqual({
      decision: 'release',
      reason: 'ok',
      codes: ['a.b'],
    });
  });

  it('sends a UUID Idempotency-Key when none is given', async () => {
    answer({ actionId: 'a', decision: 'approve', delivery: 'SENT' });
    await pipelineReviewApi.decide(JOB_ID, { decision: 'approve', reason: 'fine' });

    const key = seen[0].headers.get('Idempotency-Key');
    expect(key).not.toBeNull();
    expect(key).toMatch(UUID_PATTERN);
  });

  it('posts a reject with only decision and reason', async () => {
    answer({ actionId: 'a', decision: 'reject', delivery: 'SENT' });
    await pipelineReviewApi.decide(JOB_ID, { decision: 'reject', reason: 'not safe' }, 'key-2');

    expect(JSON.parse(seen[0].body)).toEqual({ decision: 'reject', reason: 'not safe' });
  });

  it('uses the backend wire strings for every decision type', async () => {
    answer({ actionId: 'a', decision: 'approve', delivery: 'SENT' });
    const decisions = [
      'release',
      'approve',
      'reject',
      'escalate',
      'resolve_escalation',
      'rerun',
      'cancel',
    ] as const;

    for (const decision of decisions) {
      await pipelineReviewApi.decide(
        JOB_ID,
        decision === 'release'
          ? { decision, reason: 'checked', codes: ['walls.too_thin'] }
          : { decision, reason: 'checked' },
        'key',
      );
    }

    expect(seen.map((s) => JSON.parse(s.body).decision)).toEqual(decisions);
  });
});

describe('pipelineReviewApi reports, health, submissions', () => {
  it('lists open reports by default and resolved ones on request', async () => {
    answer([]);
    await pipelineReviewApi.reports();
    await pipelineReviewApi.reports('RESOLVED');

    expect(seen.map((s) => `${s.method} ${s.url.pathname}${s.url.search}`)).toEqual([
      'GET /api/v1/admin/pipeline/review/reports?status=OPEN',
      'GET /api/v1/admin/pipeline/review/reports?status=RESOLVED',
    ]);
  });

  it('resolves a report with its note', async () => {
    answer({ id: 5, status: 'RESOLVED' });
    await pipelineReviewApi.resolveReport(5, { note: 'done' });

    expect(seen[0].method).toBe('POST');
    expect(seen[0].url.pathname).toBe('/api/v1/admin/pipeline/review/reports/5/resolve');
    expect(JSON.parse(seen[0].body)).toEqual({ note: 'done' });
  });

  it('reads the pipeline health', async () => {
    answer({ status: 'ok', consecutiveFailures: 0, activeAlertSinks: [] });
    const health = await pipelineReviewApi.health();

    expect(seen[0].method).toBe('GET');
    expect(seen[0].url.pathname).toBe('/api/v1/admin/pipeline/review/health');
    expect(health.status).toBe('ok');
  });

  it('lists the failed submissions', async () => {
    answer([]);
    await pipelineReviewApi.submissions();

    expect(seen[0].method).toBe('GET');
    expect(seen[0].url.pathname).toBe('/api/v1/admin/pipeline/submissions');
    expect(seen[0].url.searchParams.get('status')).toBe('FAILED');
  });

  it('requeues a submission with no body', async () => {
    answer({ jobId: JOB_ID, status: 'PENDING' });
    await pipelineReviewApi.requeue(JOB_ID);

    expect(seen[0].method).toBe('POST');
    expect(seen[0].url.pathname).toBe(`/api/v1/admin/pipeline/submissions/${JOB_ID}/requeue`);
    expect(seen[0].body).toBe('');
    expect(seen[0].headers.get('Content-Type')).toBeNull();
  });
});

describe('pipelineReviewApi errors', () => {
  it('rejects with an ApiError carrying the server message', async () => {
    answer(null, { status: 409, error: { code: 'X', message: 'No' } });

    const error = await pipelineReviewApi
      .decide(JOB_ID, { decision: 'approve', reason: 'fine' }, 'key')
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).message).toBe('No');
    expect((error as ApiError).code).toBe('X');
  });
});
