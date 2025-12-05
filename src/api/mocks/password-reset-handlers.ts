import { http, HttpResponse } from 'msw';
import db from './database/db';
import { generateErrorResponse, generateSuccessResponse } from './utils';
import { endpoints } from '../client/endpoints';
import { ErrorCodes } from '../client/errors';

const apiUrl = process.env.API_URL;

// Mock storage for reset codes
const resetCodes = new Map<number, { code: string; expiresAt: number }>();
const resetTokens = new Map<string, { studentId: number; expiresAt: number; used: boolean }>();

export const passwordResetHandlers = [
  // Request password reset
  http.post(`${apiUrl}${endpoints.passwordReset.request}`, async ({ request }) => {
    console.log('Password reset request received');
    const { studentId } = (await request.json()) as {
      studentId: number;
    };

    // Check if user exists
    const user = db.getUserById(studentId);

    // Always return success regardless of whether user exists (security best practice)
    // This prevents user enumeration attacks
    if (user) {
      // Generate a 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

      resetCodes.set(studentId, { code, expiresAt });

      console.log(`[MSW Mock] Password reset code for ${studentId}: ${code}`);
    }

    // Always return the same response
    return HttpResponse.json(
      generateSuccessResponse({
        message:
          'If an account exists with that Student ID, you will receive an email with a reset code.',
      }),
    );
  }),

  // Verify reset code
  http.post(`${apiUrl}${endpoints.passwordReset.verify}`, async ({ request }) => {
    console.log('Password reset verify received');
    const { studentId, code } = (await request.json()) as {
      studentId: number;
      code: string;
    };

    const storedCode = resetCodes.get(studentId);

    // Check if code exists and hasn't expired
    if (!storedCode || storedCode.code !== code || Date.now() > storedCode.expiresAt) {
      return HttpResponse.json(
        generateErrorResponse({
          code: ErrorCodes.INVALID_RESET_CODE,
          message: 'Invalid or expired reset code',
        }),
        { status: 400 },
      );
    }

    // Generate a reset token
    const resetToken = `reset-${Math.random().toString(36).substring(2)}${Date.now()}`;
    const tokenExpiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

    resetTokens.set(resetToken, {
      studentId,
      expiresAt: tokenExpiresAt,
      used: false,
    });

    // Clear the code so it can't be reused
    resetCodes.delete(studentId);

    return HttpResponse.json(
      generateSuccessResponse({
        message: 'Code verified successfully',
        resetToken,
      }),
    );
  }),

  // Complete password reset
  http.post(`${apiUrl}${endpoints.passwordReset.complete}`, async ({ request }) => {
    console.log('Password reset complete received');
    const { resetToken, newPassword } = (await request.json()) as {
      resetToken: string;
      newPassword: string;
    };

    const tokenData = resetTokens.get(resetToken);

    // Check if token exists, hasn't expired, and hasn't been used
    if (!tokenData || Date.now() > tokenData.expiresAt || tokenData.used) {
      return HttpResponse.json(
        generateErrorResponse({
          code: ErrorCodes.INVALID_RESET_TOKEN,
          message: 'Invalid or expired reset token',
        }),
        { status: 400 },
      );
    }

    // Update the user's password in the mock database
    const user = db.getUserById(tokenData.studentId);
    if (!user) {
      return HttpResponse.json(
        generateErrorResponse({
          code: ErrorCodes.USER_NOT_FOUND,
          message: 'User not found',
        }),
        { status: 404 },
      );
    }

    // Update password
    user.password = newPassword;

    // Mark token as used
    tokenData.used = true;

    console.log(`[MSW Mock] Password reset successful for student ${tokenData.studentId}`);

    return HttpResponse.json(
      generateSuccessResponse({
        message: 'Password reset successful',
      }),
    );
  }),
];
