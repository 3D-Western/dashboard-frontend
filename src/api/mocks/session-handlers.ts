import { http, HttpResponse } from 'msw';
import db from './database/db';
import {
  generateErrorResponse,
  generateSuccessResponse,
  createInvalidSessionResponse,
  mockGroupsForKeys,
} from './utils';
import { endpoints } from '../client/endpoints';
import { ErrorCodes } from '../client/errors';

const apiUrl = process.env.API_URL;

export const sessionHandlers = [
  // Auth endpoints (matching backend structure)
  http.post(`${apiUrl}${endpoints.auth.login}`, async ({ request }) => {
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

    // Store the MFA challenge in the database
    db.createMfaChallenge(challengeId, user.studentId);

    console.log('\n🔐 ========================================');
    console.log('📧 MSW: OTP Email Sent (Mock)');
    console.log('========================================');
    console.log('📝 OTP Code: 123456');
    console.log('🆔 Challenge ID:', challengeId);
    console.log('👤 User ID:', user.studentId);
    console.log('========================================\n');

    // Create headers and set mfaToken cookie
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    headers.set('Access-Control-Allow-Credentials', 'true');
    headers.append('Set-Cookie', `mfaToken=${mfaToken}; Path=/; Max-Age=${15 * 60}; SameSite=Lax`);

    return HttpResponse.json(
      generateSuccessResponse({
        mfaToken: mfaToken,
        requiresMfa: true,
        challengeId: challengeId,
      }),
      {
        headers: headers,
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

  // Users endpoints
  http.get(`${apiUrl}${endpoints.users.me}`, ({ cookies }) => {
    const sessionId = cookies['sessionToken'] || '';
    const user = db.validateSession(sessionId);

    if (!user) {
      return createInvalidSessionResponse();
    }

    // Transform user to match backend format (capitalized values)
    const userResponse = {
      studentId: user.studentId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      experienceLevel:
        user.experienceLevel
          ?.split('_')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join('_') || 'Beginner', // "no_experience" -> "No_experience", "beginner" -> "Beginner"
    };

    return HttpResponse.json(
      generateSuccessResponse({
        user: userResponse,
        groups: mockGroupsForKeys(user.groups),
        activeJobCount: 0,
      }),
    );
  }),
];
