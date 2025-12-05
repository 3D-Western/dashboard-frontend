import { apiRequest } from './base';
import { endpoints } from './endpoints';
import { getBaseUrl } from './utils';

export interface ApiPasswordResetRequestResponse {
  message: string;
}

export interface ApiPasswordResetVerifyResponse {
  message: string;
  resetToken: string;
}

export interface ApiPasswordResetCompleteResponse {
  message: string;
}

export const passwordResetApi = {
  /**
   * Request a password reset code for a student ID
   */
  requestReset: async (studentId: number, options?: RequestInit) => {
    const serverUrl = getBaseUrl();

    return apiRequest<ApiPasswordResetRequestResponse>(
      `${serverUrl}${endpoints.passwordReset.request}`,
      {
        method: 'POST',
        body: JSON.stringify({ studentId }),
        ...options,
      },
    );
  },

  /**
   * Verify the reset code sent to the user's email
   */
  verifyCode: async (studentId: number, code: string, options?: RequestInit) => {
    const serverUrl = getBaseUrl();

    return apiRequest<ApiPasswordResetVerifyResponse>(
      `${serverUrl}${endpoints.passwordReset.verify}`,
      {
        method: 'POST',
        body: JSON.stringify({ studentId, code }),
        ...options,
      },
    );
  },

  /**
   * Complete the password reset with a new password
   */
  resetPassword: async (resetToken: string, newPassword: string, options?: RequestInit) => {
    const serverUrl = getBaseUrl();

    return apiRequest<ApiPasswordResetCompleteResponse>(
      `${serverUrl}${endpoints.passwordReset.complete}`,
      {
        method: 'POST',
        body: JSON.stringify({ resetToken, newPassword }),
        ...options,
      },
    );
  },
};
