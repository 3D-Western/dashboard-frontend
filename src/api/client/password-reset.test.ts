import { describe, it, expect } from 'vitest';
import { passwordResetApi } from './password-reset';
import { mockServer } from '@/api/mocks';
import { http, HttpResponse } from 'msw';
import { endpoints } from './endpoints';
import { ErrorCodes } from './errors';

describe('passwordResetApi', () => {
  describe('requestReset', () => {
    it('requests password reset successfully', async () => {
      mockServer.use(
        http.post('*' + endpoints.resetPassword.forgotPassword, () => {
          return HttpResponse.json({
            success: true,
            data: null,
          });
        }),
      );

      const result = await passwordResetApi.requestReset(251000001);

      expect(result).toBeNull();
    });

    it('sends correct request body with student ID', async () => {
      let capturedBody: unknown = null;
      mockServer.use(
        http.post('*' + endpoints.resetPassword.forgotPassword, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json({
            success: true,
            data: null,
          });
        }),
      );

      await passwordResetApi.requestReset(251000001);

      expect(capturedBody).toEqual({ studentId: 251000001 });
    });

    it('always returns success (prevents user enumeration)', async () => {
      mockServer.use(
        http.post('*' + endpoints.resetPassword.forgotPassword, () => {
          return HttpResponse.json({
            success: true,
            data: null,
          });
        }),
      );

      const result = await passwordResetApi.requestReset(999999999);

      expect(result).toBeNull();
    });

    it('handles network errors', async () => {
      mockServer.use(
        http.post('*' + endpoints.resetPassword.forgotPassword, () => {
          return HttpResponse.json({
            success: false,
            error: {
              code: ErrorCodes.REQUEST_FAILED,
              message: 'Network error',
            },
          });
        }),
      );

      await expect(passwordResetApi.requestReset(251000001)).rejects.toMatchObject({
        code: ErrorCodes.REQUEST_FAILED,
      });
    });

    it('passes custom options to apiRequest', async () => {
      let capturedHeaders: Headers | null = null;
      mockServer.use(
        http.post('*' + endpoints.resetPassword.forgotPassword, ({ request }) => {
          capturedHeaders = request.headers;
          return HttpResponse.json({
            success: true,
            data: null,
          });
        }),
      );

      await passwordResetApi.requestReset(251000001, {
        headers: { 'X-Custom-Header': 'test' },
      });

      expect((capturedHeaders as Headers | null)?.get('X-Custom-Header')).toBe('test');
    });
  });

  describe('resetPassword', () => {
    it('resets password successfully', async () => {
      mockServer.use(
        http.post('*' + endpoints.resetPassword.resetPassword, () => {
          return HttpResponse.json({
            success: true,
            data: null,
          });
        }),
      );

      const result = await passwordResetApi.resetPassword('reset-token-123', 'NewPassword123!');

      expect(result).toBeNull();
    });

    it('sends correct request body with token and new password', async () => {
      let capturedBody: unknown = null;
      mockServer.use(
        http.post('*' + endpoints.resetPassword.resetPassword, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json({
            success: true,
            data: null,
          });
        }),
      );

      await passwordResetApi.resetPassword('reset-token-123', 'NewPassword123!');

      expect(capturedBody).toEqual({
        token: 'reset-token-123',
        newPassword: 'NewPassword123!',
      });
    });

    it('throws error for invalid reset token', async () => {
      mockServer.use(
        http.post('*' + endpoints.resetPassword.resetPassword, () => {
          return HttpResponse.json({
            success: false,
            error: {
              code: ErrorCodes.INVALID_RESET_TOKEN,
              message: 'Invalid or expired reset token',
            },
          });
        }),
      );

      await expect(
        passwordResetApi.resetPassword('invalid-token', 'NewPassword123!'),
      ).rejects.toMatchObject({
        code: ErrorCodes.INVALID_RESET_TOKEN,
      });
    });

    it('throws error for password less than 10 characters', async () => {
      mockServer.use(
        http.post('*' + endpoints.resetPassword.resetPassword, () => {
          return HttpResponse.json({
            success: false,
            error: {
              code: ErrorCodes.VALIDATION_FAILED,
              message: 'Password must be at least 10 characters',
            },
          });
        }),
      );

      await expect(
        passwordResetApi.resetPassword('reset-token-123', 'short'),
      ).rejects.toMatchObject({
        code: ErrorCodes.VALIDATION_FAILED,
      });
    });

    it('passes custom options to apiRequest', async () => {
      let capturedHeaders: Headers | null = null;
      mockServer.use(
        http.post('*' + endpoints.resetPassword.resetPassword, ({ request }) => {
          capturedHeaders = request.headers;
          return HttpResponse.json({
            success: true,
            data: null,
          });
        }),
      );

      await passwordResetApi.resetPassword('reset-token-123', 'NewPassword123!', {
        headers: { 'X-Custom-Header': 'test' },
      });

      expect((capturedHeaders as Headers | null)?.get('X-Custom-Header')).toBe('test');
    });
  });
});
