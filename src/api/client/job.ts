// ...existing code up to the end of the first jobApi object...
// Remove duplicate imports and duplicate jobApi object below
import { PrintJob, PrintJobStatus } from '@/types/jobs';
import { PrintJobListResponse } from '../types';
import { OrderListParams } from '@/types/common';
import { apiRequest } from './base';
import { endpoints } from './endpoints';
import { getBaseUrl } from './utils';

export const jobApi = {
  listAllJobs: async (params?: OrderListParams, options?: RequestInit) => {
    const searchParams = new URLSearchParams();

    if (params?.userId !== undefined) {
      searchParams.append('userId', params.userId.toString());
    }
    if (params?.status !== undefined) {
      searchParams.append('status', params.status);
    }
    if (params?.page !== undefined) {
      searchParams.append('page', params.page.toString());
    }
    if (params?.pageSize !== undefined) {
      searchParams.append('pageSize', params.pageSize.toString());
    }
    if (params?.snapshotCreatedBefore !== undefined) {
      searchParams.append('snapshotCreatedBefore', params.snapshotCreatedBefore);
    }

    const queryString = searchParams.toString();
    const url = `${getBaseUrl()}${endpoints.orders.list}${queryString ? `?${queryString}` : ''}`;

    return apiRequest<PrintJobListResponse>(url, {
      method: 'GET',
      credentials: 'include',
      ...options,
    });
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
  cancelJob: async (jobId: string, options?: RequestInit) => {
    return apiRequest<{ job: PrintJob }>(`${getBaseUrl()}${endpoints.orders.cancel(jobId)}`, {
      method: 'POST',
      credentials: 'include',
      ...options,
    });
  },
};
