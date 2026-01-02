import {
  ApiGetCurrentSessionResponse,
  ApiLoginResponse,
  ApiVerifyMfaResponse,
} from '../types';
import { apiRequest } from './base';
import { endpoints } from './endpoints';
import { getBaseUrl } from './utils';
import { ErrorCodes } from './errors';

export const sessionApi = {
  /**
   * Get current authenticated user
   * Note: This API call suppresses SESSION_INVALID errors since that's an expected state
   * when checking if a user is logged in. Other errors are still thrown.
   */
  current: async (options?: RequestInit & { cookieHeader?: string }) => {
    const serverUrl = getBaseUrl();

    // Extract custom cookieHeader option if provided
    const { cookieHeader, ...requestOptions } = options || {};

    // Build headers - include Cookie header for server-side requests
    const headers: HeadersInit = { ...requestOptions.headers };
    if (cookieHeader) {
      (headers as Record<string, string>)['Cookie'] = cookieHeader;
    }

    try {
      return await apiRequest<ApiGetCurrentSessionResponse>(
        `${serverUrl}${endpoints.users.me}`,
        {
          method: 'GET',
          credentials: 'include',
          ...requestOptions,
          headers,
        },
      );
    } catch (error) {
      // If it's a SESSION_INVALID error, suppress it and return null-like response
      // This allows validateSession() to gracefully return null
      if (error instanceof Error && 'code' in error && error.code === ErrorCodes.SESSION_INVALID) {
        return { user: null } as ApiGetCurrentSessionResponse;
      }
      // Re-throw other errors (network issues, server errors, etc.)
      throw error;
    }
  },
  login: async (studentId: number, password: string, options?: RequestInit) => {
    const serverUrl = getBaseUrl();

    return apiRequest<ApiLoginResponse>(`${serverUrl}${endpoints.auth.login}`, {
      method: 'POST',
      body: JSON.stringify({ studentId, password }),
      credentials: 'include',
      ...options,
    });
  },
  logout: async (options?: RequestInit) => {
    const serverUrl = getBaseUrl();
    return apiRequest<void>(`${serverUrl}${endpoints.auth.logout}`, {
      method: 'POST',
      credentials: 'include',
      ...options,
    });
  },
  verifyMfa: async (challengeId: number, code: string, options?: RequestInit) => {
    const serverUrl = getBaseUrl();

    return apiRequest<ApiVerifyMfaResponse>(`${serverUrl}${endpoints.mfa.verifyEmail}`, {
      method: 'POST',
      body: JSON.stringify({ challengeId, code }),
      credentials: 'include',
      ...options,
    });
  },
};
