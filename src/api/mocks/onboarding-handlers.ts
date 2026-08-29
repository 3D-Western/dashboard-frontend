import { http, HttpResponse } from 'msw';
import { endpoints } from '../client/endpoints';
import { createInvalidSessionResponse, generateSuccessResponse } from './utils';
import db from './database/db';
import { OnboardingAnswers } from '@/types/onboarding';

const apiUrl = process.env.API_URL;

export const onboardingHandlers = [
  // GET /users/me/onboarding
  http.get(`${apiUrl}${endpoints.onboarding.status}`, ({ cookies }) => {
    const sessionId = cookies['sessionToken'] || '';
    const user = db.validateSession(sessionId);
    if (!user) {
      return createInvalidSessionResponse();
    }

    return HttpResponse.json(
      generateSuccessResponse({ onboardingCompleted: db.getOnboardingStatus(user.studentId) }),
    );
  }),

  // POST /users/me/onboarding
  http.post(`${apiUrl}${endpoints.onboarding.status}`, async ({ cookies, request }) => {
    const sessionId = cookies['sessionToken'] || '';
    const user = db.validateSession(sessionId);
    if (!user) {
      return createInvalidSessionResponse();
    }

    const answers = (await request.json()) as OnboardingAnswers;
    db.completeOnboarding(user.studentId, answers);

    return HttpResponse.json(generateSuccessResponse({ onboardingCompleted: true }));
  }),
];
