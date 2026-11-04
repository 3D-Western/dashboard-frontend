import { http, HttpResponse } from 'msw';
import { endpoints } from '../client/endpoints';
import db from './database/db';
import { createInvalidSessionResponse, generateSuccessResponse } from './utils';

const apiUrl = process.env.API_URL;

// Just enough of the training API for the dashboard shell to load in mock mode: every protected
// page asks for the member's trainings and pending agreements. Without a handler the request fell
// through to the dev server's own /api proxy, which forwarded it to itself again and again until
// the headers grew too large (HTTP 431), and the Next.js dev overlay reported an issue on every page.
export const trainingHandlers = [
  http.get(`${apiUrl}${endpoints.training.list}`, ({ cookies }) => {
    if (!db.validateSession(cookies['sessionToken'] || '')) return createInvalidSessionResponse();
    return HttpResponse.json(
      generateSuccessResponse({
        orientationComplete: true,
        orientationRequired: false,
        trainings: [],
      }),
    );
  }),

  http.get(`${apiUrl}${endpoints.training.pendingAgreements}`, ({ cookies }) => {
    if (!db.validateSession(cookies['sessionToken'] || '')) return createInvalidSessionResponse();
    return HttpResponse.json(generateSuccessResponse([]));
  }),
];
