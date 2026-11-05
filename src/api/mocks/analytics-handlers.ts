import { http, HttpResponse } from 'msw';
import { endpoints } from '../client/endpoints';
import db from './database/db';
import { createInvalidSessionResponse, generateSuccessResponse } from './utils';

const apiUrl = process.env.API_URL;

// Product analytics (P-137) with no backend: the browser's batches are accepted and dropped, and the
// steps-to-submit summary is a fixed, plausible series of weeks (most recent last).

const MAX_WEEKS = 12;

/** The Monday (UTC, YYYY-MM-DD) of the week that is `weeksAgo` weeks before this one. */
function weekStart(weeksAgo: number): string {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - daysSinceMonday - weeksAgo * 7);
  return date.toISOString().slice(0, 10);
}

function mockStepsToSubmitWeeks(count: number) {
  return Array.from({ length: count }, (_, index) => {
    const weeksAgo = count - 1 - index;
    const submissions = 34 + ((index * 13) % 21);
    return {
      weekStart: weekStart(weeksAgo),
      submissions,
      students: Math.round(submissions * 0.72),
      medianSeconds: 236 - index * 4,
      medianTaps: 15 - (index % 4),
      medianScreens: 5 - (index % 2),
    };
  });
}

export const analyticsHandlers = [
  // POST /analytics/events: a batch of one visit's events; nothing is sent back but 204
  http.post(`${apiUrl}${endpoints.analytics.events}`, async ({ request }) => {
    const body = (await request.json().catch(() => null)) as {
      sessionId?: unknown;
      events?: unknown;
    } | null;
    if (
      typeof body?.sessionId !== 'string' ||
      body.sessionId === '' ||
      !Array.isArray(body.events) ||
      body.events.length === 0
    ) {
      return HttpResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: 'VALIDATION_FAILED',
            message: 'sessionId and a non-empty events array are required',
          },
        },
        { status: 400 },
      );
    }
    return new HttpResponse(null, { status: 204 });
  }),

  // GET /admin/analytics/steps-to-submit?weeks=: the admin summary, which needs a signed-in session
  http.get(`${apiUrl}${endpoints.analytics.stepsToSubmit}`, ({ cookies, request }) => {
    if (!db.validateSession(cookies['sessionToken'] || '')) return createInvalidSessionResponse();
    const requested = Number(new URL(request.url).searchParams.get('weeks') ?? MAX_WEEKS);
    const weeks = Number.isFinite(requested)
      ? Math.min(Math.max(Math.round(requested), 1), MAX_WEEKS)
      : MAX_WEEKS;
    return HttpResponse.json(
      generateSuccessResponse({
        generatedAt: new Date().toISOString(),
        minGroupSize: 5,
        weeks: mockStepsToSubmitWeeks(weeks),
      }),
    );
  }),
];
