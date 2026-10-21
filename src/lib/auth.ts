import { cache } from 'react';
import { User } from '@/types/user';
import { sessionApi } from '@/api/client/session';
import { unsubscribeThisDeviceQuietly } from '@/lib/pwa/push';

export const login = async (studentId: number, password: string): Promise<boolean> => {
  try {
    await sessionApi.login(studentId, password);
    return true;
  } catch {
    return false;
  }
};

export const logout = async (): Promise<void> => {
  // Before the session ends (the call needs it): stop this device receiving this person's
  // notifications, so the next person on a shared phone doesn't see them.
  await unsubscribeThisDeviceQuietly();
  await sessionApi.logout();
};

// sessionApi.current handles UNAUTHORIZED (no session) → returns null.
// All other errors (network, 5xx) propagate to the nearest error boundary.
export const validateSession = cache(async (): Promise<User | null> => {
  const response = await sessionApi.current();
  return response.user;
});
