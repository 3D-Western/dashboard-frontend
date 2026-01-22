import { PrintJob, PrintJobStatus } from '@/types/jobs';
import {
  CreateOrderRequest,
  CreateOrderResponse,
  CompleteUploadRequest,
  RetryUploadResponse,
  PrintJobListResponse,
} from '../types';
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
    if (params?.search !== undefined) {
      searchParams.append('search', params.search);
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
  createOrder: async (payload: CreateOrderRequest, options?: RequestInit) => {
    return apiRequest<CreateOrderResponse>(`${getBaseUrl()}${endpoints.orders.create}`, {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify(payload),
      ...options,
    });
  },
  uploadOrderFile: async (uploadUrl: string, file: File, options?: RequestInit) => {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type || 'application/sla',
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`File upload failed with status ${response.status}`);
    }

    return response;
  },
  completeUpload: async (
    orderId: string,
    payload: CompleteUploadRequest,
    options?: RequestInit,
  ) => {
    return apiRequest<null>(`${getBaseUrl()}${endpoints.orders.completeUpload(orderId)}`, {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify(payload),
      ...options,
    });
  },

  retryUpload: async (orderId: string, options?: RequestInit) => {
    return apiRequest<RetryUploadResponse>(
      `${getBaseUrl()}${endpoints.orders.retryUpload(orderId)}`,
      {
        method: 'POST',
        credentials: 'include',
        ...options,
      },
    );
  },
};
