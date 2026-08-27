import { endpoints } from './endpoints';
import { getBaseUrl } from './utils';
import { apiRequest } from './base';
import { TrainingLevel } from '@/types/training';

export const trainingAPI = {
  // client wrapper for fetching the current user's training level
  getTrainingLevel: async (options?: RequestInit) => {
    return apiRequest<{ trainingLevel: TrainingLevel }>(
      `${getBaseUrl()}${endpoints.training.level}`,
      {
        method: 'GET',
        credentials: 'include',
        ...options,
      },
    );
  },

  // client wrapper for updating the current user's training level (temporary test scaffolding
  // for the booking gate, not a real feature - see Sprint 4 Slack thread)
  updateTrainingLevel: async (trainingLevel: TrainingLevel, options?: RequestInit) => {
    return apiRequest<{ trainingLevel: TrainingLevel }>(
      `${getBaseUrl()}${endpoints.training.level}`,
      {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trainingLevel }),
        ...options,
      },
    );
  },
};
