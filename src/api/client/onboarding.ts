import { endpoints } from './endpoints';
import { getBaseUrl } from './utils';
import { apiRequest } from './base';
import { OnboardingAnswers } from '@/types/onboarding';

export const onboardingAPI = {
  // client wrapper for fetching whether the current user has completed onboarding
  getStatus: async (options?: RequestInit) => {
    return apiRequest<{ onboardingCompleted: boolean }>(
      `${getBaseUrl()}${endpoints.onboarding.status}`,
      {
        method: 'GET',
        credentials: 'include',
        ...options,
      },
    );
  },

  // client wrapper for submitting the onboarding questionnaire
  submit: async (answers: OnboardingAnswers, options?: RequestInit) => {
    return apiRequest<{ onboardingCompleted: boolean }>(
      `${getBaseUrl()}${endpoints.onboarding.status}`,
      {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(answers),
        ...options,
      },
    );
  },
};
