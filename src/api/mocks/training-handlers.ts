import { http, HttpResponse } from 'msw';
import { endpoints } from '../client/endpoints';
import { createInvalidSessionResponse, generateSuccessResponse } from './utils';
import db from './database/db';
import { TrainingLevel } from '@/types/training';

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

  // PATCH /users/me/training-level
  // Temporary self-service toggle so QA can flip Level 1 <-> Level 2 without reseeding the
  // mock DB, to validate the booking gate. Not a real feature - see Sprint 4 Slack thread.
  http.patch(`${apiUrl}${endpoints.training.level}`, async ({ cookies, request }) => {
    const sessionId = cookies['sessionToken'] || '';
    const user = db.validateSession(sessionId);
    if (!user) {
      return createInvalidSessionResponse();
    }

    const { trainingLevel } = (await request.json()) as { trainingLevel: TrainingLevel };
    const updatedUser = db.updateUserTrainingLevel(user.studentId, trainingLevel);

    return HttpResponse.json(
      generateSuccessResponse({ trainingLevel: updatedUser?.trainingLevel ?? trainingLevel }),
    );
  }),
];
