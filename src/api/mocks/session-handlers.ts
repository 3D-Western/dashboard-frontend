import { http, HttpResponse } from 'msw';
import db from './database/db';
import { generateErrorResponse, generateSuccessResponse } from './utils';
import { endpoints } from '../client/endpoints';
import { ErrorCodes } from '../client/errors';

const apiUri = process.env.API_URI;

export const sessionHandlers = [
  http.get(`${apiUri}${endpoints.session.current}`, ({ cookies }) => {
    // TODO: finalize the cookie name for the session id
    // Assuming the session ID is stored in a cookie named 'session'. But for now this will always be valid
    const sessionId = cookies['sessionId'] || '';

    const user = db.validateSession(sessionId);
    if (!user) {
      return HttpResponse.json(
        generateErrorResponse({
          code: ErrorCodes.SESSION_INVALID,
          message: 'Invalid session',
        }),
        { status: 403 },
      );
    }

    return HttpResponse.json(generateSuccessResponse(user));
  }),
  http.post(`${apiUri}${endpoints.session.login}`, async ({ request }) => {
    const { studentId, password } = (await request.json()) as {
      studentId: number;
      password: string;
    };
    const user = db.authenticateUser(studentId, password);
    if (!user) {
      return HttpResponse.json(
        generateErrorResponse({
          code: ErrorCodes.SESSION_INVALID,
          message: 'Invalid credentials',
        }),
        { status: 401 },
      );
    }

    const sessionToken = db.createSession(user.id);
    return HttpResponse.json(generateSuccessResponse({ sessionToken: sessionToken }), {
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': `sessionToken=${sessionToken}; path=/; max-age=${
          60 * 60 * 24 * 7
        }; SameSite=Strict`,
        'Access-Control-Allow-Credentials': 'true',
      },
    });
  }),
];
