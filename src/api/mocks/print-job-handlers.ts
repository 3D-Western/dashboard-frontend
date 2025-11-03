import { http, HttpResponse } from 'msw';
import { endpoints } from '../client/endpoints';
import db from './database/db';
import { createInvalidSessionResponse, generateSuccessResponse } from './utils';

const apiUrl = process.env.API_URL;

export const printJobHandlers = [
  http.get(`${apiUrl}${endpoints.jobs.listAllActiveJobs}`, ({ cookies }) => {
    const sessionId = cookies['sessionToken'] || '';
    const user = db.validateSession(sessionId);
    if (!user) {
      return createInvalidSessionResponse();
    }
    const jobs = db.getPrintJobsByUserId(user.id);
    return HttpResponse.json(generateSuccessResponse({ jobs: jobs }));
  }),
  
  http.post(`${apiUrl}/api/orders/active/cancel/:id`, ({ params, cookies }) => {
    const sessionId = cookies['sessionToken'] || '';
    const user = db.validateSession(sessionId);
    if (!user) {
      return createInvalidSessionResponse();
    }
    const { id } = params; 

    return HttpResponse.json(
      generateSuccessResponse({ message: `Cancelled job ${id}` })
    );
  }),
];
