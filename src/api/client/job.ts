import { PrintJob, PrintJobStatus } from '@/types/jobs';
import { ApiGetAllActivePrintJobsResponse } from '../types';
import { apiRequest } from './base';
import { endpoints } from './endpoints';
import { getBaseUrl } from './utils';

export const jobApi = {
  listAllJobs: async (options?: RequestInit) => {
    return apiRequest<ApiGetAllActivePrintJobsResponse>(
      `${getBaseUrl()}${endpoints.orders.list}`,
      {
        method: 'GET',
        credentials: 'include',
        ...options,
      },
    );
  },

  updateJobStatus: async (jobId: string, status: PrintJobStatus, options?: RequestInit) => {
    return apiRequest<{ job: PrintJob }>(`${getBaseUrl()}${endpoints.orders.byId(jobId)}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
      ...options,
    });
  },

  deleteJob: async (jobId: string, options?: RequestInit) => {
    return apiRequest<{ success: boolean }>(`${getBaseUrl()}${endpoints.orders.byId(jobId)}`, {
      method: 'DELETE',
      credentials: 'include',
      ...options,
    });
  },
};
