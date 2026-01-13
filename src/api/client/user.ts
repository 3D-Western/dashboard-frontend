import { User } from '@/types/user';
import { PrintJobListResponse, UserListResponse } from '../types';
import { CurrentUserORderListParams, UserListParams } from '@/types/common';
import { apiRequest } from './base';
import { endpoints } from './endpoints';
import { getBaseUrl } from './utils';

export const userApi = {
  listAllUsers: async (params?: UserListParams, options?: RequestInit) => {
    const searchParams = new URLSearchParams();

    if (params?.search !== undefined) {
      searchParams.append('search', params.search);
    }
    if (params?.status !== undefined) {
      searchParams.append('status', params.status);
    }
    if (params?.trainingLevel !== undefined) {
      searchParams.append('trainingLevel', params.trainingLevel);
    }
    if (params?.experienceLevel !== undefined) {
      searchParams.append('experienceLevel', params.experienceLevel);
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
    const url = `${getBaseUrl()}${endpoints.users.list}${queryString ? `?${queryString}` : ''}`;

    return apiRequest<UserListResponse>(url, {
      method: 'GET',
      credentials: 'include',
      ...options,
    });
  },

  getUserById: async (userId: number, options?: RequestInit) => {
    return apiRequest<User>(`${getBaseUrl()}${endpoints.users.byId(userId)}`, {
      method: 'GET',
      credentials: 'include',
      ...options,
    });
  },

  getCurrentUserOrders: async (params?: CurrentUserORderListParams, options?: RequestInit) => {
    const searchParams = new URLSearchParams();

    if (params?.status !== undefined) {
      searchParams.append('status', params.status);
    }
    if (params?.search !== undefined) {
      searchParams.append('search', params.search);
    }
    if (params?.pageSize !== undefined) {
      searchParams.append('pageSize', params.pageSize.toString());
    }
    if (params?.snapshotCreatedBefore !== undefined) {
      searchParams.append('snapshotCreatedBefore', params.snapshotCreatedBefore);
    }
    if (params?.page !== undefined) {
      searchParams.append('page', params.page.toString());
    }

    const queryString = searchParams.toString();
    const url = `${getBaseUrl()}${endpoints.users.orders}${queryString ? `?${queryString}` : ''}`;

    console.log('Fetching current user orders with URL:', url);

    return apiRequest<PrintJobListResponse>(url, {
      method: 'GET',
      credentials: 'include',
      ...options,
    });
  },
};
