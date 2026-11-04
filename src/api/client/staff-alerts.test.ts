import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { mockServer } from '@/api/mocks';
import { ApiError } from './errors';
import { staffAlertsApi } from './staff-alerts';

interface Seen {
  method: string;
  url: URL;
  body: string;
}

let seen: Seen[] = [];

function answer(data: unknown = null, init: { status?: number; error?: object } = {}) {
  mockServer.use(
    http.all('*/api/v1/*', async ({ request }) => {
      seen.push({ method: request.method, url: new URL(request.url), body: await request.text() });
      return HttpResponse.json(
        init.error ? { success: false, data: null, error: init.error } : { success: true, data },
        { status: init.status ?? 200 },
      );
    }),
  );
}

beforeEach(() => {
  seen = [];
});

describe('staffAlertsApi', () => {
  it('lists with no query string by default', async () => {
    answer({ items: [], total: 0, unacknowledged: 0 });
    await staffAlertsApi.list();

    expect(seen[0].method).toBe('GET');
    expect(seen[0].url.pathname).toBe('/api/v1/admin/alerts');
    expect(seen[0].url.search).toBe('');
  });

  it('sends the kind, state and severity filters comma-separated, and the limit', async () => {
    answer({ items: [], total: 0, unacknowledged: 0 });
    await staffAlertsApi.list({
      kind: ['hold', 'pipeline_outage'],
      state: ['open', 'acknowledged'],
      severity: ['critical'],
      limit: 100,
    });

    const params = seen[0].url.searchParams;
    expect(params.get('kind')).toBe('hold,pipeline_outage');
    expect(params.get('state')).toBe('open,acknowledged');
    expect(params.get('severity')).toBe('critical');
    expect(params.get('limit')).toBe('100');
  });

  it('reads the summary for the nav badge', async () => {
    answer({ unacknowledged: 4, unacknowledgedCritical: 1 });

    await expect(staffAlertsApi.summary()).resolves.toEqual({
      unacknowledged: 4,
      unacknowledgedCritical: 1,
    });
    expect(seen[0].url.pathname).toBe('/api/v1/admin/alerts/summary');
  });

  it('acknowledges with a POST and no body', async () => {
    answer({ id: 7, state: 'acknowledged' });
    await staffAlertsApi.acknowledge(7);

    expect(seen[0].method).toBe('POST');
    expect(seen[0].url.pathname).toBe('/api/v1/admin/alerts/7/acknowledge');
    expect(seen[0].body).toBe('');
  });

  it('resolves with the note', async () => {
    answer({ id: 7, state: 'resolved' });
    await staffAlertsApi.resolve(7, { note: 'Looked fine' });

    expect(seen[0].method).toBe('POST');
    expect(seen[0].url.pathname).toBe('/api/v1/admin/alerts/7/resolve');
    expect(JSON.parse(seen[0].body)).toEqual({ note: 'Looked fine' });
  });

  it('turns a 409 for an already resolved alert into an ApiError with the backend message', async () => {
    answer(null, {
      status: 409,
      error: { code: 'INVALID_JOB_STATUS', message: 'That alert is already resolved' },
    });

    const failure = await staffAlertsApi.acknowledge(7).catch((e: unknown) => e);

    expect(failure).toBeInstanceOf(ApiError);
    expect((failure as ApiError).message).toBe('That alert is already resolved');
  });
});
