import { apiRequest } from './base';
import { endpoints } from './endpoints';
import { getBaseUrl } from './utils';

export interface ApiPasswordResetRequestResponse {
  success: boolean;
  data: null;
  error?: {
    code: string;
    message: string;
  };
}

export interface ApiPasswordResetCompleteResponse {
  success: boolean;
  data: null;
  error?: {
    code: string;
    message: string;
  };
}

export const passwordResetApi = {
  /**
   * Request a password reset link for a student ID
   * Sends an email with a reset token link if the student ID exists
   */
  requestReset: async (studentId: number, options?: RequestInit) => {
    const serverUrl = getBaseUrl();

    return apiRequest<ApiPasswordResetRequestResponse>(
      `${serverUrl}${endpoints.resetPassword.forgotPassword}`,
      {
        method: 'POST',
        body: JSON.stringify({ studentId }),
        ...options,
      },
    );
  },

  /**
   * Complete the password reset with the token and new password
   * Token is obtained from the reset link sent via email
   * Password must be at least 10 characters
   */
  resetPassword: async (token: string, newPassword: string, options?: RequestInit) => {
    const serverUrl = getBaseUrl();

    return apiRequest<ApiPasswordResetCompleteResponse>(
      `${serverUrl}${endpoints.resetPassword.resetPassword}`,
      {
        method: 'POST',
        body: JSON.stringify({ token, newPassword }),
        ...options,
      },
    );
  },
};
