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
];
