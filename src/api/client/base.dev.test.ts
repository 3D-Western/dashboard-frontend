import { describe, it, expect, vi, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { mockServer } from '@/api/mocks';

describe('apiRequest (development logging)', () => {
  const testUrl = 'http://api.test/dev-log';
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    vi.restoreAllMocks();
  });

  it('logs response data when NODE_ENV is development', async () => {
    vi.resetModules();
    process.env.NODE_ENV = 'development';

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const { apiRequest } = await import('./base');

    mockServer.use(
      http.get(testUrl, () => {
        return HttpResponse.json({ success: true, data: { result: 'ok' } });
      }),
    );

    await apiRequest(testUrl, { method: 'GET' });

    expect(consoleSpy).toHaveBeenCalledWith({ success: true, data: { result: 'ok' } });
  });
});
