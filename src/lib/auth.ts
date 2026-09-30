import { cache } from 'react';
import { User } from '@/types/user';
import { sessionApi } from '@/api/client/session';

export const login = async (studentId: number, password: string): Promise<boolean> => {
  try {
    await sessionApi.login(studentId, password);
    return true;
  } catch {
    return false;
  }
};

export const logout = async (): Promise<void> => {
  await sessionApi.logout();
};

// sessionApi.current treats any failure to confirm a session (UNAUTHORIZED, an unexpected
// backend error, a network failure, etc.) as "not logged in" and resolves to null rather than
// throwing — this check must never crash the app. Only a non-ApiError (a genuine bug elsewhere)
// still propagates to the nearest error boundary.
export const validateSession = cache(async (): Promise<User | null> => {
  const response = await sessionApi.current();
  return response.user;
});
