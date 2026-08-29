import { http, HttpResponse } from 'msw';
import { endpoints } from '../client/endpoints';
import { createInvalidSessionResponse, generateSuccessResponse } from './utils';
import db from './database/db';
import { mockAccountLimits } from './data/limits';
import { calculateUsage } from '@/utils/usage-calculators';
import { UsagePeriod } from '@/types/usage';

const apiUrl = process.env.API_URL;

export const usageHandlers = [
  // GET /users/:id/usage?period=
  http.get(`${apiUrl}${endpoints.usage.summary(':id')}`, ({ cookies, params, request }) => {
    const sessionId = cookies['sessionToken'] || '';
    const user = db.validateSession(sessionId);
    if (!user) {
      return createInvalidSessionResponse();
    }

    const { id } = params;
    const targetUserId = Number(Array.isArray(id) ? id[0] : id);

    const url = new URL(request.url);
    const period = (url.searchParams.get('period') as UsagePeriod) || 'month';

    const jobs = db.getPrintJobsByUserId(targetUserId);
    const entries = calculateUsage(jobs, period);

    return HttpResponse.json(generateSuccessResponse({ period, entries }));
  }),

  // GET /users/:id/limits
  http.get(`${apiUrl}${endpoints.usage.limits(':id')}`, ({ cookies }) => {
    const sessionId = cookies['sessionToken'] || '';
    const user = db.validateSession(sessionId);
    if (!user) {
      return createInvalidSessionResponse();
    }

    return HttpResponse.json(generateSuccessResponse({ limits: mockAccountLimits }));
  }),
];
