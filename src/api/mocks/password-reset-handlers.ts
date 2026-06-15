import { http, HttpResponse } from 'msw';
import db from './database/db';
import { generateErrorResponse, generateSuccessResponse } from './utils';
import { endpoints } from '../client/endpoints';
import { ErrorCodes } from '../client/errors';

const apiUrl = process.env.API_URL;

// Mock storage for reset tokens (matches backend behavior)
const resetTokens = new Map<string, { studentId: number; expiresAt: number; used: boolean }>();

export const passwordResetHandlers = [
  // Request password reset (forgot-password)
  http.post(`${apiUrl}${endpoints.resetPassword.forgotPassword}`, async ({ request }) => {
    console.log('Password reset request received');
    const { studentId } = (await request.json()) as {
      studentId: number;
    };

    // Check if user exists
    const user = db.getUserById(studentId);

    // Always return success regardless of whether user exists (security best practice)
    // This prevents user enumeration attacks
    if (user) {
      // Generate a secure reset token (mimics backend behavior)
      const token = `mock-reset-token-${Math.random().toString(36).substring(2)}${Date.now()}`;
      const expiresAt = Date.now() + 30 * 60 * 1000; // 30 minutes (matches backend default)

      resetTokens.set(token, {
        studentId,
        expiresAt,
        used: false,
      });

      console.log(`[MSW Mock] Password reset token for ${studentId}: ${token}`);
      console.log(`[MSW Mock] Reset link: http://localhost:3000/reset-password?token=${token}`);
    }

    // Always return the same response (matches backend behavior)
    return HttpResponse.json(generateSuccessResponse(null), { status: 200 });
  }),

  // Complete password reset
  http.post(`${apiUrl}${endpoints.resetPassword.resetPassword}`, async ({ request }) => {
    console.log('Password reset complete received');
    const { token, newPassword } = (await request.json()) as {
      token: string;
      newPassword: string;
    };

    // Validate password length (backend requires 10+ characters)
    if (newPassword.length < 10) {
      return HttpResponse.json(
        generateErrorResponse({
          code: ErrorCodes.VALIDATION_FAILED,
          message: 'Password must be at least 10 characters',
        }),
        { status: 400 },
      );
    }

    const tokenData = resetTokens.get(token);

    // Check if token exists, hasn't expired, and hasn't been used
    if (!tokenData || Date.now() > tokenData.expiresAt || tokenData.used) {
      return HttpResponse.json(
        generateErrorResponse({
          code: ErrorCodes.INVALID_RESET_TOKEN,
          message: 'Invalid or expired reset token',
        }),
        { status: 401 },
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

    // Update password (in production, this would be hashed with BCrypt)
    user.password = newPassword;

    // Mark token as used
    tokenData.used = true;

    console.log(`[MSW Mock] Password reset successful for student ${tokenData.studentId}`);

    return HttpResponse.json(generateSuccessResponse(null), { status: 200 });
  }),
];
