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
};