import { describe, it, expect } from 'vitest';
import { validateSession, login, logout } from '@/lib/auth';
import {
  mockAuthenticatedSession,
  mockUnauthenticatedSession,
  mockSuccessfulLogin,
  mockFailedLogin,
  mockSuccessfulLogout,
} from '@test/utils/authHelpers';
import { createMockUser } from '@test/utils/mockFactories';

describe('Auth Integration Tests', () => {
  describe('Full Login Flow', () => {
    it('completes full login flow: unauthenticated → login → authenticated', async () => {
      // Start: User is not authenticated
      mockUnauthenticatedSession();
      const initialSession = await validateSession();
      expect(initialSession).toBeNull();

      // Step 1: User logs in
      mockSuccessfulLogin();
      const loginResult = await login(251000001, 'password');
      expect(loginResult).toBe(true);

      // Step 2: After login, validateSession returns the user
      const mockUser = createMockUser({ studentId: 251000001 });
      mockAuthenticatedSession(mockUser);
      const postLoginSession = await validateSession();
      expect(postLoginSession).toMatchObject({
        studentId: mockUser.studentId,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        groups: mockUser.groups,
      });
    });

    it('handles login failure without breaking authentication flow', async () => {
      // Start: User is not authenticated
      mockUnauthenticatedSession();
      const initialSession = await validateSession();
      expect(initialSession).toBeNull();

      // Step 1: Login attempt fails
      mockFailedLogin();
      const loginResult = await login(251000001, 'wrongpassword');
      expect(loginResult).toBe(false);

      // Step 2: User is still not authenticated
      mockUnauthenticatedSession();
      const stillUnauthenticated = await validateSession();
      expect(stillUnauthenticated).toBeNull();
    });
  });

  describe('Full Logout Flow', () => {
    it('completes full logout flow: authenticated → logout → unauthenticated', async () => {
      // Start: User is authenticated
      const mockUser = createMockUser();
      mockAuthenticatedSession(mockUser);
      const initialSession = await validateSession();
      expect(initialSession).toMatchObject({
        studentId: mockUser.studentId,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        groups: mockUser.groups,
      });

      // Step 1: User logs out
      mockSuccessfulLogout();
      await logout();

      // Step 2: After logout, validateSession returns null
      mockUnauthenticatedSession();
      const postLogoutSession = await validateSession();
      expect(postLogoutSession).toBeNull();
    });
  });

  describe('Session Persistence', () => {
    it('maintains session across multiple validateSession calls', async () => {
      const mockUser = createMockUser();
      mockAuthenticatedSession(mockUser);

      // Call validateSession multiple times
      const session1 = await validateSession();
      const session2 = await validateSession();
      const session3 = await validateSession();

      expect(session1).toMatchObject({
        studentId: mockUser.studentId,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        groups: mockUser.groups,
      });
      expect(session2).toMatchObject({
        studentId: mockUser.studentId,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        groups: mockUser.groups,
      });
      expect(session3).toMatchObject({
        studentId: mockUser.studentId,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        groups: mockUser.groups,
      });
    });
  });

  describe('Concurrent Session Validation', () => {
    it('handles concurrent validateSession calls correctly', async () => {
      const mockUser = createMockUser();
      mockAuthenticatedSession(mockUser);

      // Make multiple concurrent calls
      const [session1, session2, session3] = await Promise.all([
        validateSession(),
        validateSession(),
        validateSession(),
      ]);

      expect(session1).toMatchObject({
        studentId: mockUser.studentId,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        groups: mockUser.groups,
      });
      expect(session2).toMatchObject({
        studentId: mockUser.studentId,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        groups: mockUser.groups,
      });
      expect(session3).toMatchObject({
        studentId: mockUser.studentId,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        groups: mockUser.groups,
      });
    });

    it('handles concurrent validateSession calls when unauthenticated', async () => {
      mockUnauthenticatedSession();

      // Make multiple concurrent calls
      const [session1, session2, session3] = await Promise.all([
        validateSession(),
        validateSession(),
        validateSession(),
      ]);

      expect(session1).toBeNull();
      expect(session2).toBeNull();
      expect(session3).toBeNull();
    });
  });

  describe('Session Expiry Handling', () => {
    it('returns null when session has expired', async () => {
      // User starts authenticated
      const mockUser = createMockUser();
      mockAuthenticatedSession(mockUser);
      const session = await validateSession();
      expect(session).toMatchObject({
        studentId: mockUser.studentId,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        groups: mockUser.groups,
      });

      // Session expires — backend returns UNAUTHORIZED
      mockUnauthenticatedSession();
      const expiredSession = await validateSession();
      expect(expiredSession).toBeNull();
    });
  });
});
