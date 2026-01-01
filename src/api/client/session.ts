import { ApiGetCurrentSessionResponse, ApiLoginResponse } from '../types';
import { apiRequest } from './base';
import { endpoints } from './endpoints';
import { getBaseUrl } from './utils';
import { ErrorCodes } from './errors';

export const sessionApi = {
  /**
   * Get current authenticated session
   * Note: This API call suppresses SESSION_INVALID errors since that's an expected state
   * when checking if a user is logged in. Other errors are still thrown.
   */
  current: async (options?: RequestInit) => {
    const serverUrl = getBaseUrl();

    try {
      return await apiRequest<ApiGetCurrentSessionResponse>(
        `${serverUrl}${endpoints.session.current}`,
        {
          method: 'GET',
          credentials: 'include',
          ...options,
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
};
