import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withSessionErrorHandling } from './server-utils';
import { ApiError, ErrorCodes } from '@/api/client/errors';
import { redirect } from 'next/navigation';

// Mock Next.js redirect
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

describe('withSessionErrorHandling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns successful result when no error occurs', async () => {
    const mockData = { id: 1, value: 'test' };
    const fn = vi.fn().mockResolvedValue(mockData);

    const result = await withSessionErrorHandling(fn);

    expect(result).toEqual(mockData);
    expect(fn).toHaveBeenCalledOnce();
    expect(redirect).not.toHaveBeenCalled();
  });

  it('redirects to login for SESSION_INVALID error', async () => {
    const fn = vi
      .fn()
      .mockRejectedValue(new ApiError(ErrorCodes.SESSION_INVALID, 'Invalid session'));

    await expect(withSessionErrorHandling(fn)).rejects.toThrow();

    expect(redirect).toHaveBeenCalledWith('/login?error=unauthenticated');
  });

  it('redirects to login for SESSION_EXPIRED error', async () => {
    const fn = vi.fn().mockRejectedValue(new ApiError('SESSION_EXPIRED', 'Session expired'));

    await expect(withSessionErrorHandling(fn)).rejects.toThrow();

    expect(redirect).toHaveBeenCalledWith('/login?error=unauthenticated');
  });

  it('redirects to login for UNAUTHORIZED error', async () => {
    const fn = vi.fn().mockRejectedValue(new ApiError(ErrorCodes.UNAUTHORIZED, 'Unauthorized'));

    await expect(withSessionErrorHandling(fn)).rejects.toThrow();

    expect(redirect).toHaveBeenCalledWith('/login?error=unauthenticated');
  });

  it('re-throws non-session ApiError', async () => {
    const error = new ApiError(ErrorCodes.REQUEST_FAILED, 'Request failed');
    const fn = vi.fn().mockRejectedValue(error);

    await expect(withSessionErrorHandling(fn)).rejects.toThrow(error);

    expect(redirect).not.toHaveBeenCalled();
  });

  it('re-throws non-ApiError errors', async () => {
    const error = new Error('Generic error');
    const fn = vi.fn().mockRejectedValue(error);

    await expect(withSessionErrorHandling(fn)).rejects.toThrow(error);

    expect(redirect).not.toHaveBeenCalled();
  });

  it('re-throws ApiError with different error code', async () => {
    const error = new ApiError(ErrorCodes.VALIDATION_FAILED, 'Validation failed');
    const fn = vi.fn().mockRejectedValue(error);

    await expect(withSessionErrorHandling(fn)).rejects.toThrow(error);

    expect(redirect).not.toHaveBeenCalled();
  });

  it('handles async function correctly', async () => {
    const mockData = { result: 'success' };
    const fn = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return mockData;
    });

    const result = await withSessionErrorHandling(fn);

    expect(result).toEqual(mockData);
    expect(fn).toHaveBeenCalledOnce();
  });

  it('passes through function execution context', async () => {
    const context = { test: 'context' };
    const fn = vi
      .fn(function (this: unknown) {
        return Promise.resolve(this);
      })
      .bind(context);

    const result = await withSessionErrorHandling(fn);

    expect(result).toBe(context);
  });

  it('handles promise rejections correctly', async () => {
    const error = new ApiError(ErrorCodes.INTERNAL_SERVER_ERROR, 'Server error');
    const fn = vi.fn(() => Promise.reject(error));

    await expect(withSessionErrorHandling(fn)).rejects.toThrow(error);

    expect(redirect).not.toHaveBeenCalled();
  });
});
