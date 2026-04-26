import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiRequest } from './base';
import { ApiError, ErrorCodes } from './errors';
import { mockServer } from '@/api/mocks';
import { http, HttpResponse } from 'msw';
import { cookies } from 'next/headers';

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

const cookiesMock = cookies as unknown as ReturnType<typeof vi.fn>;

describe('apiRequest', () => {
  const testUrl = 'http://api.test/endpoint';

  describe('Content-Type header', () => {
    it('sets Content-Type to application/json when body is present', async () => {
      let capturedHeaders: Headers | null = null;
      mockServer.use(
        http.post(testUrl, ({ request }) => {
          capturedHeaders = request.headers;
          return HttpResponse.json({ success: true, data: { result: 'ok' } });
        }),
      );

      await apiRequest(testUrl, {
        method: 'POST',
        body: JSON.stringify({ test: 'data' }),
      });

      expect((capturedHeaders as Headers | null)?.get('Content-Type')).toBe('application/json');
    });

    it('does not set Content-Type when skipContentTypeHeader is true', async () => {
      let capturedHeaders: Headers | null = null;
      mockServer.use(
        http.post(testUrl, ({ request }) => {
          capturedHeaders = request.headers;
          return HttpResponse.json({ success: true, data: { result: 'ok' } });
        }),
      );

      await apiRequest(
        testUrl,
        {
          method: 'POST',
          body: new FormData(),
        },
        { skipContentTypeHeader: true },
      );

      expect((capturedHeaders as Headers | null)?.get('Content-Type')).not.toBe('application/json');
    });

    it('does not override user-provided Content-Type', async () => {
      let capturedHeaders: Headers | null = null;
      mockServer.use(
        http.post(testUrl, ({ request }) => {
          capturedHeaders = request.headers;
          return HttpResponse.json({ success: true, data: { result: 'ok' } });
        }),
      );

      await apiRequest(testUrl, {
        method: 'POST',
        body: 'plain text',
        headers: {
          'Content-Type': 'text/plain',
        },
      });

      expect((capturedHeaders as Headers | null)?.get('Content-Type')).toBe('text/plain');
    });

    it('does not set Content-Type when there is no body', async () => {
      let capturedHeaders: Headers | null = null;
      mockServer.use(
        http.get(testUrl, ({ request }) => {
          capturedHeaders = request.headers;
          return HttpResponse.json({ success: true, data: { result: 'ok' } });
        }),
      );

      await apiRequest(testUrl, { method: 'GET' });

      expect((capturedHeaders as Headers | null)?.get('Content-Type')).toBeNull();
    });
  });

  describe('credentials and cookies', () => {
    it('includes credentials with the request', async () => {
      let capturedCredentials: RequestCredentials | undefined;
      const originalFetch = global.fetch;
      vi.stubGlobal(
        'fetch',
        vi.fn((url: Parameters<typeof fetch>[0], options: Parameters<typeof fetch>[1]) => {
          capturedCredentials = options?.credentials;
          return originalFetch(url, options);
        }),
      );

      mockServer.use(
        http.get(testUrl, () => {
          return HttpResponse.json({ success: true, data: { result: 'ok' } });
        }),
      );

      await apiRequest(testUrl, { method: 'GET' });

      expect(capturedCredentials).toBe('include');

      vi.unstubAllGlobals();
    });
  });

  describe('server-side cookie forwarding', () => {
    let originalFetch: typeof global.fetch;

    beforeEach(() => {
      originalFetch = global.fetch;
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      vi.clearAllMocks();
    });

    it('adds Cookie header when server-side cookies exist', async () => {
      vi.stubGlobal('window', undefined as unknown as Window);

      const cookieStore = {
        get: vi.fn((name: string) => {
          if (name === 'sessionToken') return { value: 'session-token' };
          if (name === 'mfaToken') return { value: 'mfa-token' };
          return undefined;
        }),
      };

      cookiesMock.mockResolvedValue(cookieStore);

      let capturedCookie: string | null = null;
      mockServer.use(
        http.get(testUrl, () => {
          return HttpResponse.json({ success: true, data: { result: 'ok' } });
        }),
      );

      vi.stubGlobal(
        'fetch',
        vi.fn((url: Parameters<typeof fetch>[0], options: Parameters<typeof fetch>[1]) => {
          const headers = new Headers(options?.headers);
          capturedCookie = headers.get('Cookie');
          return originalFetch(url, options);
        }),
      );

      await apiRequest(testUrl, { method: 'GET' });

      expect(capturedCookie).toBe('sessionToken=session-token; mfaToken=mfa-token');
    });

    it('does not add Cookie header when no server-side cookies exist', async () => {
      vi.stubGlobal('window', undefined as unknown as Window);

      const cookieStore = {
        get: vi.fn(() => undefined),
      };

      cookiesMock.mockResolvedValue(cookieStore);

      let capturedCookie: string | null = null;
      mockServer.use(
        http.get(testUrl, () => {
          return HttpResponse.json({ success: true, data: { result: 'ok' } });
        }),
      );

      vi.stubGlobal(
        'fetch',
        vi.fn((url: Parameters<typeof fetch>[0], options: Parameters<typeof fetch>[1]) => {
          const headers = new Headers(options?.headers);
          capturedCookie = headers.get('Cookie');
          return originalFetch(url, options);
        }),
      );

      await apiRequest(testUrl, { method: 'GET' });

      expect(capturedCookie).toBeNull();
    });

    it('respects provided Cookie header without overriding', async () => {
      vi.stubGlobal('window', undefined as unknown as Window);

      const cookieStore = {
        get: vi.fn(() => ({ value: 'server-token' })),
      };

      cookiesMock.mockResolvedValue(cookieStore);

      let capturedCookie: string | null = null;
      mockServer.use(
        http.get(testUrl, () => {
          return HttpResponse.json({ success: true, data: { result: 'ok' } });
        }),
      );

      vi.stubGlobal(
        'fetch',
        vi.fn((url: Parameters<typeof fetch>[0], options: Parameters<typeof fetch>[1]) => {
          const headers = new Headers(options?.headers);
          capturedCookie = headers.get('Cookie');
          return originalFetch(url, options);
        }),
      );

      await apiRequest(testUrl, {
        method: 'GET',
        headers: { Cookie: 'sessionToken=provided-token' },
      });

      expect(capturedCookie).toBe('sessionToken=provided-token');
    });
  });

  describe('204 No Content response', () => {
    it('returns undefined for 204 status', async () => {
      mockServer.use(
        http.delete(testUrl, () => {
          return new HttpResponse(null, { status: 204 });
        }),
      );

      const result = await apiRequest(testUrl, { method: 'DELETE' });

      expect(result).toBeUndefined();
    });
  });

  describe('JSON vs non-JSON responses', () => {
    it('parses JSON response successfully', async () => {
      const mockData = { id: 1, name: 'Test' };
      mockServer.use(
        http.get(testUrl, () => {
          return HttpResponse.json({ success: true, data: mockData });
        }),
      );

      const result = await apiRequest<{ id: number; name: string }>(testUrl);

      expect(result).toEqual(mockData);
    });

    it('throws RESPONSE_INVALID_CONTENT_TYPE for non-JSON when expectJson is true', async () => {
      mockServer.use(
        http.get(testUrl, () => {
          return new HttpResponse('Plain text', {
            headers: { 'Content-Type': 'text/plain' },
          });
        }),
      );

      await expect(apiRequest(testUrl, {}, { expectJson: true })).rejects.toThrow(ApiError);
      await expect(apiRequest(testUrl, {}, { expectJson: true })).rejects.toMatchObject({
        code: ErrorCodes.RESPONSE_INVALID_CONTENT_TYPE,
      });
    });

    it('throws RESPONSE_INVALID_CONTENT_TYPE when content-type is missing', async () => {
      mockServer.use(
        http.get(testUrl, () => {
          return new HttpResponse('No content type', {
            headers: { 'Content-Type': '' },
          });
        }),
      );

      await expect(apiRequest(testUrl, {}, { expectJson: true })).rejects.toMatchObject({
        code: ErrorCodes.RESPONSE_INVALID_CONTENT_TYPE,
      });
    });

    it('returns Response object for non-JSON when expectJson is false', async () => {
      mockServer.use(
        http.get(testUrl, () => {
          return new HttpResponse('Plain text', {
            headers: { 'Content-Type': 'text/plain' },
          });
        }),
      );

      const result = await apiRequest<Response>(testUrl, {}, { expectJson: false });

      expect(result).toBeInstanceOf(Response);
      expect(await result.text()).toBe('Plain text');
    });

    it('throws error for non-JSON content-type when expectJson is true', async () => {
      mockServer.use(
        http.get(testUrl, () => {
          return new HttpResponse('Some content', {
            headers: { 'Content-Type': 'text/plain' },
          });
        }),
      );

      try {
        await apiRequest(testUrl, {}, { expectJson: true });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).code).toBe(ErrorCodes.RESPONSE_INVALID_CONTENT_TYPE);
        expect((error as ApiError).message).toContain('Expected JSON but got text/plain');
      }
    });
  });

  describe('error handling', () => {
    it('throws ApiError when response has error field', async () => {
      mockServer.use(
        http.get(testUrl, () => {
          return HttpResponse.json({
            success: false,
            data: null,
            error: {
              code: 'TEST_ERROR',
              message: 'Test error message',
              details: { field: 'test' },
            },
          });
        }),
      );

      await expect(apiRequest(testUrl)).rejects.toThrow(ApiError);
      await expect(apiRequest(testUrl)).rejects.toMatchObject({
        code: 'TEST_ERROR',
        message: expect.stringContaining('Test error message'),
        details: { field: 'test' },
      });
    });

    it('throws ApiError when success is false', async () => {
      mockServer.use(
        http.get(testUrl, () => {
          return HttpResponse.json({
            success: false,
            data: null,
            error: {
              code: ErrorCodes.REQUEST_FAILED,
              message: 'Request failed',
            },
          });
        }),
      );

      await expect(apiRequest(testUrl)).rejects.toThrow(ApiError);
    });

    it('throws ApiError with UNKNOWN_ERROR when error code is missing', async () => {
      mockServer.use(
        http.get(testUrl, () => {
          return HttpResponse.json({
            success: false,
            data: null,
            error: {
              message: 'Something went wrong',
            },
          });
        }),
      );

      await expect(apiRequest(testUrl)).rejects.toMatchObject({
        code: 'UNKNOWN_ERROR',
      });
    });

    it('does not throw when suppressApiError is true', async () => {
      mockServer.use(
        http.get(testUrl, () => {
          return HttpResponse.json({
            success: false,
            data: null,
            error: {
              code: ErrorCodes.REQUEST_FAILED,
              message: 'Request failed',
            },
          });
        }),
      );

      const result = await apiRequest(testUrl, {}, { suppressApiError: true });

      expect(result).toBeNull();
    });

    it('returns data even when error is present if suppressApiError is true', async () => {
      const mockData = { result: 'data' };
      mockServer.use(
        http.get(testUrl, () => {
          return HttpResponse.json({
            success: false,
            data: mockData,
            error: {
              code: ErrorCodes.REQUEST_FAILED,
              message: 'Request failed',
            },
          });
        }),
      );

      const result = await apiRequest(testUrl, {}, { suppressApiError: true });

      expect(result).toEqual(mockData);
    });
  });

  describe('successful responses', () => {
    it('returns data from successful response', async () => {
      const mockData = { id: 1, value: 'test' };
      mockServer.use(
        http.get(testUrl, () => {
          return HttpResponse.json({
            success: true,
            data: mockData,
          });
        }),
      );

      const result = await apiRequest(testUrl);

      expect(result).toEqual(mockData);
    });

    it('handles array data in response', async () => {
      const mockData = [{ id: 1 }, { id: 2 }];
      mockServer.use(
        http.get(testUrl, () => {
          return HttpResponse.json({
            success: true,
            data: mockData,
          });
        }),
      );

      const result = await apiRequest(testUrl);

      expect(result).toEqual(mockData);
    });

    it('handles null data in successful response', async () => {
      mockServer.use(
        http.get(testUrl, () => {
          return HttpResponse.json({
            success: true,
            data: null,
          });
        }),
      );

      const result = await apiRequest(testUrl);

      expect(result).toBeNull();
    });
  });

  describe('default config values', () => {
    it('uses default config when none provided', async () => {
      mockServer.use(
        http.get(testUrl, () => {
          return HttpResponse.json({ success: true, data: { test: 'ok' } });
        }),
      );

      const result = await apiRequest(testUrl);

      expect(result).toEqual({ test: 'ok' });
    });

    it('merges partial config with defaults', async () => {
      const mockData = { test: 'data' };
      mockServer.use(
        http.post(testUrl, () => {
          return HttpResponse.json({ success: true, data: mockData });
        }),
      );

      const result = await apiRequest(
        testUrl,
        { method: 'POST', body: JSON.stringify(mockData) },
        { expectJson: true }, // Only specify one config option
      );

      expect(result).toEqual(mockData);
    });
  });

  describe('network error handling', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('throws ApiError with REQUEST_FAILED when network request fails', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network connection failed')));

      await expect(apiRequest(testUrl)).rejects.toThrow(ApiError);
      await expect(apiRequest(testUrl)).rejects.toMatchObject({
        code: ErrorCodes.REQUEST_FAILED,
        message: expect.stringContaining('Network request failed'),
      });
    });

    it('includes original error in ApiError details when network fails', async () => {
      const networkError = new Error('Connection timeout');
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(networkError));

      try {
        await apiRequest(testUrl);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).details).toMatchObject({
          url: testUrl,
          originalError: networkError,
        });
      }
    });

    it('handles non-Error network failures gracefully', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue('String error'));

      await expect(apiRequest(testUrl)).rejects.toMatchObject({
        code: ErrorCodes.REQUEST_FAILED,
        message: expect.stringContaining('Network request failed'),
      });
    });
  });

  describe('JSON parsing error handling', () => {
    it('throws ApiError when JSON parsing fails', async () => {
      mockServer.use(
        http.get(testUrl, () => {
          return new HttpResponse('Invalid JSON{', {
            headers: { 'Content-Type': 'application/json' },
          });
        }),
      );

      await expect(apiRequest(testUrl)).rejects.toThrow(ApiError);
      await expect(apiRequest(testUrl)).rejects.toMatchObject({
        code: ErrorCodes.RESPONSE_INVALID_CONTENT_TYPE,
        message: expect.stringContaining('Failed to parse response as JSON'),
      });
    });

    it('includes response details in error when JSON parsing fails', async () => {
      mockServer.use(
        http.get(testUrl, () => {
          return new HttpResponse('Not valid JSON', {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }),
      );

      try {
        await apiRequest(testUrl);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).details).toMatchObject({
          url: testUrl,
          status: 200,
          contentType: 'application/json',
        });
      }
    });

    it('handles malformed JSON response gracefully', async () => {
      mockServer.use(
        http.get(testUrl, () => {
          return new HttpResponse('{incomplete:', {
            headers: { 'Content-Type': 'application/json' },
          });
        }),
      );

      await expect(apiRequest(testUrl)).rejects.toMatchObject({
        code: ErrorCodes.RESPONSE_INVALID_CONTENT_TYPE,
      });
    });
  });
});
