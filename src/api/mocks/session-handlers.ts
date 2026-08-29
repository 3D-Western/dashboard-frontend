import { http, HttpResponse } from 'msw';
import db from './database/db';
import {
  generateErrorResponse,
  generateSuccessResponse,
  createInvalidSessionResponse,
  mockGroupsForKeys,
  mockPermissionsForGroups,
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

    if (user.emailVerified === false) {
      return HttpResponse.json(
        generateErrorResponse({
          code: ErrorCodes.EMAIL_NOT_VERIFIED,
          message: 'You must verify your email before logging in',
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

  // Faithful to the real backend's SessionService.signup(): creates an unverified account,
  // sends (logs) a verification token, and never returns a session/mfa token from signup itself.
  http.post(`${apiUrl}${endpoints.auth.signup}`, async ({ request }) => {
    const body = (await request.json()) as {
      studentId: number;
      email: string;
      password: string;
      firstName: string;
      lastName: string;
    };

    const result = db.createUser(body);

    if (result === 'DUPLICATE_STUDENT_ID') {
      return HttpResponse.json(
        generateErrorResponse({
          code: 'USER_ALREADY_EXISTS',
          message: `User with student ID ${body.studentId} already exists`,
        }),
        { status: 409 },
      );
    }
    if (result === 'DUPLICATE_EMAIL') {
      return HttpResponse.json(
        generateErrorResponse({
          code: 'USER_ALREADY_EXISTS',
          message: `User with email ${body.email} already exists`,
        }),
        { status: 409 },
      );
    }

    db.createVerificationToken(result.studentId);

    return HttpResponse.json(
      generateSuccessResponse({
        user: {
          studentId: result.studentId,
          email: result.email,
          firstName: result.firstName,
          lastName: result.lastName,
        },
        requiresEmailVerification: true,
        message: 'Account created successfully. Please check your email to verify your account.',
      }),
      { status: 201 },
    );
  }),

  http.post(`${apiUrl}${endpoints.emailVerify.verifyEmail}`, async ({ request }) => {
    const { token } = (await request.json()) as { token: string };
    const user = db.verifyEmailToken(token);

    if (!user) {
      return HttpResponse.json(
        generateErrorResponse({
          code: 'INVALID_VERIFICATION_TOKEN',
          message: 'Invalid or expired verification token',
        }),
        { status: 400 },
      );
    }

    return HttpResponse.json(
      generateSuccessResponse({
        message: 'Email verified successfully. You can now log in.',
        email: user.email,
      }),
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
    };

    return HttpResponse.json(
      generateSuccessResponse({
        user: userResponse,
        groups: mockGroupsForKeys(user.groups),
        permissions: mockPermissionsForGroups(user.groups),
        activeJobCount: 0,
      }),
    );
  }),
];
