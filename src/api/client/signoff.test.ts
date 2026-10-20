import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { mockServer } from '../mocks';
import { signoffAPI } from './signoff';
import { getBaseUrl } from './utils';
import { ApiError } from './errors';
import { isAlreadyDecided, signoffErrorMessage } from './signoff-errors';

const baseUrl = getBaseUrl();
const ok = (data: unknown) => HttpResponse.json({ success: true, data });

function capture(method: 'get' | 'post', path: string, data: unknown = {}) {
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

describe('signoffAPI', () => {
  it('lists the queue and reads one request', async () => {
    const list = capture('get', '/api/v1/admin/training/signoffs', [{ id: 9 }]);
    const one = capture('get', '/api/v1/admin/training/signoffs/9', { id: 9 });

    expect(await signoffAPI.list()).toEqual([{ id: 9 }]);
    expect(await signoffAPI.get(9)).toEqual({ id: 9 });
    expect(list.method).toBe('GET');
    expect(one.path).toBe('/api/v1/admin/training/signoffs/9');
  });

  it('approves with the ticked keys', async () => {
    const seen = capture('post', '/api/v1/admin/training/signoffs/9/approve', { id: 9 });

    await signoffAPI.approve(9, ['estop', 'vent']);

    expect(seen.method).toBe('POST');
    expect(seen.body).toEqual({ checkedKeys: ['estop', 'vent'] });
  });

  it('rejects with a reason and what was ticked', async () => {
    const seen = capture('post', '/api/v1/admin/training/signoffs/9/reject', { id: 9 });

    await signoffAPI.reject(9, 'Not ready', ['estop']);

    expect(seen.body).toEqual({ reason: 'Not ready', checkedKeys: ['estop'] });
  });

  it('turns an error envelope into an ApiError with the code', async () => {
    mockServer.use(
      http.post(`${baseUrl}/api/v1/admin/training/signoffs/9/approve`, () =>
        HttpResponse.json(
          { success: false, error: { code: 'SIGNOFF_ALREADY_DECIDED', message: 'done' } },
          { status: 409 },
        ),
      ),
    );

    const error = await signoffAPI.approve(9, []).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(isAlreadyDecided(error)).toBe(true);
  });
});

describe('signoffErrorMessage', () => {
  it('gives plain wording for every sign-off code', () => {
    const codes = [
      'SIGNOFF_ALREADY_DECIDED',
      'SIGNOFF_SELF_FORBIDDEN',
      'SIGNOFF_CHECKLIST_INCOMPLETE',
      'SIGNOFF_UNKNOWN_ITEM',
      'SIGNOFF_REASON_REQUIRED',
      'CERTIFICATION_CHANGED',
      'SIGNOFF_NOT_FOUND',
      'FORBIDDEN',
      'REQUEST_FAILED',
      'SESSION_EXPIRED',
    ];
    for (const code of codes) {
      expect(signoffErrorMessage(new ApiError(code), 'fallback')).not.toBe('fallback');
    }
  });

  it('falls back for anything else', () => {
    expect(signoffErrorMessage(new ApiError('SOMETHING_NEW'), 'fallback')).toBe('fallback');
    expect(signoffErrorMessage(new Error('boom'), 'fallback')).toBe('fallback');
    expect(isAlreadyDecided(new Error('x'))).toBe(false);
  });
});
