import { http, HttpResponse } from 'msw';
import db from './database/db';
import {
  generateErrorResponse,
  generateSuccessResponse,
  createInvalidSessionResponse,
} from './utils';
import { endpoints } from '../client/endpoints';
import { ErrorCodes } from '../client/errors';

const apiUrl = process.env.API_URL;

export const sessionHandlers = [
  // Auth endpoints (matching backend structure)
  http.post(`${apiUrl}${endpoints.auth.login}`, async ({ request }) => {
    console.log('Login request received');
    const { studentId, password } = (await request.json()) as {
      studentId: number;
      password: string;
    };
    const user = db.authenticateUser(studentId, password);
    if (!user) {
      return HttpResponse.json(
        generateErrorResponse({
          code: ErrorCodes.INVALID_CREDENTIALS,
          message: 'Invalid credentials',
        }),
        { status: 401 },
      );
    }

    // Mock MFA flow - return mfaToken instead of sessionToken
    const mfaToken = 'mock-mfa-token-' + Date.now();
    const challengeId = 123;

    console.log('\n🔐 ========================================');
    console.log('📧 MSW: OTP Email Sent (Mock)');
    console.log('========================================');
    console.log('📝 OTP Code: 123456');
    console.log('🆔 Challenge ID:', challengeId);
    console.log('========================================\n');

    return HttpResponse.json(
      generateSuccessResponse({
        mfaToken: mfaToken,
        requiresMfa: true,
        challengeId: challengeId,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': `mfaToken=${mfaToken}; path=/; max-age=${15 * 60}; HttpOnly; SameSite=Strict`,
          'Access-Control-Allow-Credentials': 'true',
        },
      },
    );
  }),

  http.post(`${apiUrl}${endpoints.auth.logout}`, ({ cookies }) => {
    const sessionId = cookies['sessionToken'] || '';
    const user = db.validateSession(sessionId);
    if (!user) {
      return createInvalidSessionResponse();
    }

    db.userLogout(sessionId);
    return HttpResponse.json(generateSuccessResponse({}));
  }),

  // Session endpoints
  http.get(`${apiUrl}${endpoints.session.current}`, ({ cookies }) => {
    const sessionId = cookies['sessionToken'] || '';

    const user = db.validateSession(sessionId);
    if (!user) {
      return createInvalidSessionResponse();
    }

    return HttpResponse.json(generateSuccessResponse({ user: user }));
  }),
];
