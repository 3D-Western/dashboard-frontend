import {
  ApiGetCurrentSessionResponse,
  ApiLoginResponse,
  ApiVerifyMfaResponse,
  ApiSignupRequest,
  ApiSignupResponse,
  VerifyEmailResponse,
} from '../types';
import { apiRequest } from './base';
import { endpoints } from './endpoints';
import { getBaseUrl } from './utils';
import { ApiError, ErrorCodes } from './errors';
import { transformUserResponse } from './transformers';
import { User } from '@/types/user';

export const sessionApi = {
  /**
   * Get current authenticated user
   * Note: This API call suppresses UNAUTHORIZED, SESSION_INVALID, and SESSION_EXPIRED errors
   * since those are expected states when checking if a user is logged in. Other errors are still thrown.
   */
  current: async (options?: RequestInit): Promise<{ user: User | null }> => {
    const serverUrl = getBaseUrl();

    try {
      const response = await apiRequest<ApiGetCurrentSessionResponse>(
        `${serverUrl}${endpoints.users.me}`,
        {
          method: 'GET',
          credentials: 'include',
          ...options,
        },
      );

      return {
        user: response.user
          ? transformUserResponse(response.user, response.groups ?? [], response.permissions ?? [])
          : null,
      };
    } catch (error) {
      // Auth/session errors mean no valid session — expected when checking login state
      if (
        error instanceof ApiError &&
        [ErrorCodes.UNAUTHORIZED, ErrorCodes.SESSION_INVALID, ErrorCodes.SESSION_EXPIRED].includes(
          error.code,
        )
      ) {
        return { user: null };
      }
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

    return apiRequest<ApiVerifyMfaResponse>(`${serverUrl}${endpoints.mfa.verifyOtp}`, {
      method: 'POST',
      body: JSON.stringify({ challengeId, code }),
      credentials: 'include',
      ...options,
    });
  },
  resendMfaOtp: async (challengeId: number, options?: RequestInit) => {
    const serverUrl = getBaseUrl();

    return apiRequest<{ challengeId: number }>(
      `${serverUrl}${endpoints.mfa.resendOtp(challengeId)}`,
      {
        method: 'POST',
        credentials: 'include',
        ...options,
      },
    );
  },
  signup: async (signupData: ApiSignupRequest, options?: RequestInit) => {
    const serverUrl = getBaseUrl();

    return apiRequest<ApiSignupResponse>(`${serverUrl}${endpoints.auth.signup}`, {
      method: 'POST',
      body: JSON.stringify(signupData),
      credentials: 'include',
      ...options,
    });
  },
  resendEmailVerification: async (studentId: number, options?: RequestInit) => {
    const serverUrl = getBaseUrl();

    return apiRequest<void>(`${serverUrl}${endpoints.emailVerify.resendEmail}`, {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({ studentId }),
      ...options,
    });
  },
  verifyEmail: async (token: string, options?: RequestInit) => {
    const serverUrl = getBaseUrl();
    return apiRequest<VerifyEmailResponse>(`${serverUrl}${endpoints.emailVerify.verifyEmail}`, {
      method: 'POST',
      body: JSON.stringify({ token }),
      credentials: 'include',
      ...options,
    });
  },
};
