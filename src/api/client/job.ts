import { ApiGetAllActivePrintJobsResponse } from '../types';
import { apiRequest } from './base';
import { endpoints } from './endpoints';
import { getBaseUrl } from './utils';

export const jobApi = {
  listAllJobs: async (options?: RequestInit) => {
    return apiRequest<ApiGetAllActivePrintJobsResponse>(
      `${getBaseUrl()}${endpoints.jobs.listAllActiveJobs}`,
      {
        method: 'GET',
        credentials: 'include',
        ...options,
      },
    );
  },
};
