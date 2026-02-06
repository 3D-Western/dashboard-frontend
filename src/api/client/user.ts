import { User } from '@/types/user';
import { PaginatedResponse } from '@/types/common';
import { PrintJobListResponse, UserListResponseRaw, UserResponse } from '../types';
import { CurrentUserJobListParams, UserListParams } from '@/types/common';
import { apiRequest } from './base';
import { endpoints } from './endpoints';
import { getBaseUrl } from './utils';
import { transformUserResponse, transformUserListResponse } from './transformers';

export const userApi = {
  listAllUsers: async (
    params?: UserListParams,
    options?: RequestInit,
  ): Promise<PaginatedResponse<User>> => {
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

    const response = await apiRequest<UserListResponseRaw>(url, {
      method: 'GET',
      credentials: 'include',
      ...options,
    });

    return transformUserListResponse(response);
  },

  getUserById: async (userId: number, options?: RequestInit): Promise<User> => {
    const response = await apiRequest<UserResponse>(
      `${getBaseUrl()}${endpoints.users.byId(userId)}`,
      {
        method: 'GET',
        credentials: 'include',
        ...options,
      },
    );

    return transformUserResponse(response);
  },

  getCurrentUserJobs: async (params?: CurrentUserJobListParams, options?: RequestInit) => {
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

    return apiRequest<PrintJobListResponse>(url, {
      method: 'GET',
      credentials: 'include',
      ...options,
    });
  },

  changePassword: async (
    currentPassword: string,
    newPassword: string,
    confirmNewPassword: string,
    invalidateAllSessions?: boolean,
    options?: RequestInit,
  ) => {
    const url = `${getBaseUrl()}${endpoints.users.changePassword}`;

    return apiRequest<{ message: string }>(url, {
      method: 'POST',
      body: JSON.stringify({
        currentPassword,
        newPassword,
        confirmNewPassword,
        invalidateAllSessions: invalidateAllSessions ?? false,
      }),
      credentials: 'include',
      ...options,
    });
  },
};
