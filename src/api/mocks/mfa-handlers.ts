import { http, HttpResponse } from 'msw';
import { generateErrorResponse, generateSuccessResponse } from './utils';
import { endpoints } from '../client/endpoints';
import { ErrorCodes } from '../client/errors';
import db from './database/db';

const apiUrl = process.env.API_URL;

const VALID_OTP_CODE = '123456';
const MOCK_CHALLENGE_ID = 123;

export const mfaHandlers = [
  // MFA OTP verification endpoint
  http.post(`${apiUrl}${endpoints.mfa.verifyOtp}`, async ({ request }) => {
    const body = (await request.json()) as {
      challengeId: number;
      code: string;
    };

    const { challengeId, code } = body;

    // Validate the MFA challenge exists
    const userId = db.validateMfaChallenge(challengeId);
    if (!userId) {
      return HttpResponse.json(
        generateErrorResponse({
          code: ErrorCodes.INVALID_OTP,
          message: 'Invalid or expired MFA challenge',
        }),
        { status: 401 },
      );
    }

    // Accept only "123456" as valid OTP code
    if (code === VALID_OTP_CODE) {
      // Create a session in the database
      const sessionToken = db.createSession(userId);

      // Complete the MFA challenge (remove it from storage)
      db.completeMfaChallenge(challengeId);

      // Create headers and set multiple cookies using append
      const headers = new Headers();
      headers.set('Content-Type', 'application/json');
      headers.set('Access-Control-Allow-Credentials', 'true');
      headers.append(
        'Set-Cookie',
        `sessionToken=${sessionToken}; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax`,
      );
      headers.append('Set-Cookie', `mfaToken=; Path=/; Max-Age=0; SameSite=Lax`);

      return HttpResponse.json(
        generateSuccessResponse({
          sessionToken: sessionToken,
        }),
        {
          headers: headers,
        },
      );
    }

    // Reject any other code
    return HttpResponse.json(
      generateErrorResponse({
        code: ErrorCodes.INVALID_OTP,
        message: 'The OTP code is incorrect or has expired',
      }),
      { status: 401 },
    );
  }),

  // MFA OTP resend endpoint
  http.post(`${apiUrl}/api/v1/mfa/email/challenge/:challengeId/resend`, async ({ params }) => {
    const { challengeId: _challengeId } = params;

    console.log('\n🔐 ========================================');
    console.log('📧 MSW: OTP Email Sent (Mock)');
    console.log('========================================');
    console.log('📝 OTP Code:', VALID_OTP_CODE);
    console.log('🆔 Challenge ID:', MOCK_CHALLENGE_ID);
    console.log('========================================\n');

    // Mock successful resend
    return HttpResponse.json(
      generateSuccessResponse({
        challengeId: MOCK_CHALLENGE_ID,
      }),
    );
  }),

  // Email verification with token endpoint
  http.post(`${apiUrl}${endpoints.emailVerify.verifyEmail}`, async ({ request }) => {
    const body = (await request.json()) as {
      token: string;
    };

    // Valid tokens for testing
    const validTokens = ['valid-token-123', 'test-token-abc123'];

    if (validTokens.includes(body.token)) {
      return HttpResponse.json(
        generateSuccessResponse({
          message: 'Email verified successfully',
        }),
      );
    }

    // Handle specific error cases for testing
    if (body.token === 'expired-token') {
      return HttpResponse.json(
        generateErrorResponse({
          code: 'TOKEN_EXPIRED',
          message: 'The verification link has expired. Please request a new one.',
        }),
        { status: 400 },
      );
    }

    if (body.token === 'already-used-token') {
      return HttpResponse.json(
        generateErrorResponse({
          code: 'ALREADY_VERIFIED',
          message: 'This email address has already been verified.',
        }),
        { status: 400 },
      );
    }

    // Default invalid token response
    return HttpResponse.json(
      generateErrorResponse({
        code: 'INVALID_TOKEN',
        message: 'The verification token is invalid or has expired',
      }),
      { status: 400 },
    );
  }),

  // Email verification resend endpoint
  http.post(`${apiUrl}${endpoints.emailVerify.resendEmail}`, async ({ request }) => {
    const { studentId } = (await request.json()) as { studentId: number };

    console.log('\n📧 ========================================');
    console.log('📨 MSW: Email Verification Sent (Mock)');
    console.log('========================================');
    console.log('👤 Student ID:', studentId);
    console.log('📧 Check your email for the verification link');
    console.log('========================================\n');

    // Mock successful email send
    return HttpResponse.json(
      generateSuccessResponse({
        message: 'Verification email sent',
      }),
    );
  }),
];
