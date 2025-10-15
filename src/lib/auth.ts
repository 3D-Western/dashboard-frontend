// import 'server-only';
import { cache } from 'react';
import { User } from '@/types/user';

/**
 * Calls the backend to get the authenticated user. If no user is authenticated, returns null.
 * cache is used to avoid multiple calls in the same request.
 */
export const getUser = cache(async (): Promise<User | null> => {
  // TODO: Replace with real authentication logic
  return {
    id: 123456,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
  } as User;
});

export const logout = async (): Promise<void> => {
  // TODO: Replace with real logout logic
};
