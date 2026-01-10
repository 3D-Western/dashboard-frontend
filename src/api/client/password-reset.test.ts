import { describe, it, expect } from 'vitest';
import { passwordResetApi } from './password-reset';
import { mockServer } from '@/api/mocks';
import { http, HttpResponse } from 'msw';
import { endpoints } from './endpoints';
import { ErrorCodes } from './errors';

describe('passwordResetApi', () => {
  describe('requestReset', () => {
    it('requests password reset successfully', async () => {
      const mockResponse = { message: 'Reset code sent to your email' };
      mockServer.use(
        http.post('*' + endpoints.passwordReset.request, () => {
          return HttpResponse.json({
            success: true,
            data: mockResponse,
          });
        }),
      );

      const result = await passwordResetApi.requestReset(251000001);

      expect(result).toEqual(mockResponse);
    });

    it('sends correct request body with student ID', async () => {
      let capturedBody: unknown = null;
      mockServer.use(
        http.post('*' + endpoints.passwordReset.request, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json({
            success: true,
            data: { message: 'Code sent' },
          });
        }),
      );

      await passwordResetApi.requestReset(251000001);

      expect(capturedBody).toEqual({ studentId: 251000001 });
    });

    it('throws error for invalid student ID', async () => {
      mockServer.use(
        http.post('*' + endpoints.passwordReset.request, () => {
          return HttpResponse.json({
            success: false,
            error: {
              code: ErrorCodes.USER_NOT_FOUND,
              message: 'Student not found',
            },
          });
        }),
      );

      await expect(passwordResetApi.requestReset(999999999)).rejects.toMatchObject({
        code: ErrorCodes.USER_NOT_FOUND,
      });
    });

    it('handles network errors', async () => {
      mockServer.use(
        http.post('*' + endpoints.passwordReset.request, () => {
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
        http.post('*' + endpoints.passwordReset.request, ({ request }) => {
          capturedHeaders = request.headers;
          return HttpResponse.json({
            success: true,
            data: { message: 'Code sent' },
          });
        }),
      );

      await passwordResetApi.requestReset(251000001, {
        headers: { 'X-Custom-Header': 'test' },
      });

      expect(capturedHeaders?.get('X-Custom-Header')).toBe('test');
    });
  });

  describe('verifyCode', () => {
    it('verifies reset code successfully', async () => {
      const mockResponse = {
        message: 'Code verified',
        resetToken: 'reset-token-123',
      };
      mockServer.use(
        http.post('*' + endpoints.passwordReset.verify, () => {
          return HttpResponse.json({
            success: true,
            data: mockResponse,
          });
        }),
      );

      const result = await passwordResetApi.verifyCode(251000001, '123456');

      expect(result).toEqual(mockResponse);
      expect(result.resetToken).toBe('reset-token-123');
    });

    it('sends correct request body with student ID and code', async () => {
      let capturedBody: unknown = null;
      mockServer.use(
        http.post('*' + endpoints.passwordReset.verify, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json({
            success: true,
            data: { message: 'Verified', resetToken: 'token' },
          });
        }),
      );

      await passwordResetApi.verifyCode(251000001, '123456');

      expect(capturedBody).toEqual({
        studentId: 251000001,
        code: '123456',
      });
    });

    it('throws error for invalid reset code', async () => {
      mockServer.use(
        http.post('*' + endpoints.passwordReset.verify, () => {
          return HttpResponse.json({
            success: false,
            error: {
              code: ErrorCodes.INVALID_RESET_CODE,
              message: 'Invalid or expired reset code',
            },
          });
        }),
      );

      await expect(passwordResetApi.verifyCode(251000001, '000000')).rejects.toMatchObject({
        code: ErrorCodes.INVALID_RESET_CODE,
      });
    });

    it('handles expired code error', async () => {
      mockServer.use(
        http.post('*' + endpoints.passwordReset.verify, () => {
          return HttpResponse.json({
            success: false,
            error: {
              code: ErrorCodes.INVALID_RESET_CODE,
              message: 'Reset code has expired',
            },
          });
        }),
      );

      await expect(passwordResetApi.verifyCode(251000001, '123456')).rejects.toMatchObject({
        code: ErrorCodes.INVALID_RESET_CODE,
        message: expect.stringContaining('expired'),
      });
    });

    it('passes custom options to apiRequest', async () => {
      let capturedHeaders: Headers | null = null;
      mockServer.use(
        http.post('*' + endpoints.passwordReset.verify, ({ request }) => {
          capturedHeaders = request.headers;
          return HttpResponse.json({
            success: true,
            data: { message: 'Verified', resetToken: 'token' },
          });
        }),
      );

      await passwordResetApi.verifyCode(251000001, '123456', {
        headers: { 'X-Custom-Header': 'test' },
      });

      expect(capturedHeaders?.get('X-Custom-Header')).toBe('test');
    });
  });

  describe('resetPassword', () => {
    it('resets password successfully', async () => {
      const mockResponse = { message: 'Password reset successful' };
      mockServer.use(
        http.post('*' + endpoints.passwordReset.complete, () => {
          return HttpResponse.json({
            success: true,
            data: mockResponse,
          });
        }),
      );

      const result = await passwordResetApi.resetPassword('reset-token-123', 'NewPassword123!');

      expect(result).toEqual(mockResponse);
    });

    it('sends correct request body with reset token and new password', async () => {
      let capturedBody: unknown = null;
      mockServer.use(
        http.post('*' + endpoints.passwordReset.complete, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json({
            success: true,
            data: { message: 'Password reset' },
          });
        }),
      );

      await passwordResetApi.resetPassword('reset-token-123', 'NewPassword123!');

      expect(capturedBody).toEqual({
        resetToken: 'reset-token-123',
        newPassword: 'NewPassword123!',
      });
    });

    it('throws error for invalid reset token', async () => {
      mockServer.use(
        http.post('*' + endpoints.passwordReset.complete, () => {
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

    it('throws error for weak password', async () => {
      mockServer.use(
        http.post('*' + endpoints.passwordReset.complete, () => {
          return HttpResponse.json({
            success: false,
            error: {
              code: ErrorCodes.VALIDATION_FAILED,
              message: 'Password does not meet requirements',
            },
          });
        }),
      );

      await expect(passwordResetApi.resetPassword('reset-token-123', 'weak')).rejects.toMatchObject(
        {
          code: ErrorCodes.VALIDATION_FAILED,
        },
      );
    });

    it('passes custom options to apiRequest', async () => {
      let capturedHeaders: Headers | null = null;
      mockServer.use(
        http.post('*' + endpoints.passwordReset.complete, ({ request }) => {
          capturedHeaders = request.headers;
          return HttpResponse.json({
            success: true,
            data: { message: 'Password reset' },
          });
        }),
      );

      await passwordResetApi.resetPassword('reset-token-123', 'NewPassword123!', {
        headers: { 'X-Custom-Header': 'test' },
      });

      expect(capturedHeaders?.get('X-Custom-Header')).toBe('test');
    });
  });
});
