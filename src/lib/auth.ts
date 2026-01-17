import { User } from '@/types/user';
import { sessionApi } from '@/api/client/session';

/**
 * Attempts to log in a user with the provided student ID and password.
 *
 * @param {number} studentId - The student's ID number.
 * @param {string} password - The user's password.
 * @returns {Promise<boolean>} Resolves to true if login is successful, false otherwise.
 */
export const login = async (studentId: number, password: string): Promise<boolean> => {
  try {
    await sessionApi.login(studentId, password);
    return true;
  } catch {
    return false;
  }
};

/**
 * Logs out the current user.
 *
 * @returns {Promise<void>} Resolves when the logout process is complete.
 */
export const logout = async (): Promise<void> => {
  await sessionApi.logout();
};

/**
 * Validates the current user session and returns the user if authenticated.
 *
 * @returns {Promise<User | null>} Resolves to the user object if authenticated, or null if not.
 */
export const validateSession = async (): Promise<User | null> => {
  // For server-side requests, we need to manually forward cookies
  let cookieHeader: string | undefined;
  if (typeof window === 'undefined') {
    // Dynamic import to avoid bundling next/headers in client bundles
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('sessionToken');

    if (sessionToken) {
      cookieHeader = `sessionToken=${sessionToken.value}`;
    }
  }

  try {
    const response = await sessionApi.current({ cookieHeader });
    if (!response.user) {
      return null;
    }

    return response.user;
  } catch {
    return null;
  }
};
