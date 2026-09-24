import { AccountStatus, AdminUserProfile, User } from '@/types/user';
import { PaginatedResponse } from '@/types/common';
import {
  PrintJobListResponse,
  UserListResponseRaw,
  UserResponse,
  AdminUserProfileResponse,
  AdminUserListResponseRaw,
} from '../types';
import { AdminUserListParams, CurrentUserJobListParams, UserListParams } from '@/types/common';
import { apiRequest } from './base';
import { endpoints } from './endpoints';
import { getBaseUrl } from './utils';
import {
  transformUserResponse,
  transformUserListResponse,
  transformAdminUserProfileResponse,
  transformAdminUserListResponse,
} from './transformers';

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

  /**
   * Lists users for the admin Users Management table. Deliberately separate from
   * `listAllUsers` above: that function's `search`/`status`/`trainingLevel` params don't
   * correspond to anything the real `GET /api/v1/users` endpoint supports (pre-existing drift,
   * see AdminUserListParams doc comment) — this one only sends params backend actually accepts.
   */
  listAdminUsers: async (
    params?: AdminUserListParams,
    options?: RequestInit,
  ): Promise<PaginatedResponse<AdminUserProfile>> => {
    const searchParams = new URLSearchParams();

    if (params?.studentId !== undefined) {
      searchParams.append('studentId', params.studentId.toString());
    }
    if (params?.email !== undefined) {
      searchParams.append('email', params.email);
    }
    if (params?.firstName !== undefined) {
      searchParams.append('firstName', params.firstName);
    }
    if (params?.lastName !== undefined) {
      searchParams.append('lastName', params.lastName);
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

    const response = await apiRequest<AdminUserListResponseRaw>(url, {
      method: 'GET',
      credentials: 'include',
      ...options,
    });

    return transformAdminUserListResponse(response);
  },

  /**
   * Overrides a user's account status (PATCH /api/v1/users/{id}/status). Endpoint, casing, and
   * body/response shape confirmed directly against backend source (UserController.kt /
   * UpdateUserStatusRequest.kt) rather than assumed — see the plan doc for details. `reason` is
   * optional; backend discards it automatically when status is set back to "Active".
   */
  updateAccountStatus: async (
    studentId: number,
    status: AccountStatus,
    reason?: string,
    options?: RequestInit,
  ): Promise<AdminUserProfile> => {
    const response = await apiRequest<AdminUserProfileResponse>(
      `${getBaseUrl()}${endpoints.users.updateStatus(studentId)}`,
      {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reason: reason ?? null }),
        ...options,
      },
    );

    return transformAdminUserProfileResponse(response);
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
    const url = `${getBaseUrl()}${endpoints.users.jobs}${queryString ? `?${queryString}` : ''}`;

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

    return apiRequest<{
      message: string;
      sessionsInvalidated: boolean;
      emailSent: boolean;
    }>(url, {
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
