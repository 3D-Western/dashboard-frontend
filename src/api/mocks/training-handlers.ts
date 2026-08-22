import { http, HttpResponse } from 'msw';
import { endpoints } from '../client/endpoints';
import { createInvalidSessionResponse, generateSuccessResponse } from './utils';
import db from './database/db';

const apiUrl = process.env.API_URL;

export const trainingHandlers = [
  // GET /users/me/training-level
  http.get(`${apiUrl}${endpoints.training.level}`, ({ cookies }) => {
    const sessionId = cookies['sessionToken'] || '';
    const user = db.validateSession(sessionId);
    if (!user) {
      return createInvalidSessionResponse();
    }

    return HttpResponse.json(generateSuccessResponse({ trainingLevel: user.trainingLevel }));
  }),
];
