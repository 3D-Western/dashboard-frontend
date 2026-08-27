import { describe, it, expect } from 'vitest';
import { validateSession, login, logout } from './auth';
import {
  mockAuthenticatedSession,
  mockUnauthenticatedSession,
  mockSuccessfulLogin,
  mockFailedLogin,
} from '@test/utils/authHelpers';
import { http, HttpResponse } from 'msw';
import { mockServer } from '@/api/mocks';
import { endpoints } from '@/api/client/endpoints';

describe('auth', () => {
  describe('validateSession', () => {
    it('returns user when session is valid', async () => {
      const mockUser = mockAuthenticatedSession();

      const result = await validateSession();

      expect(result).toMatchObject({
        studentId: mockUser.studentId,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        groups: mockUser.groups,
      });
    });

    it('returns null when unauthenticated', async () => {
      mockUnauthenticatedSession();

      const result = await validateSession();

      expect(result).toBeNull();
    });

    it('propagates network errors so the error boundary can catch them', async () => {
      mockServer.use(
        http.get(`*${endpoints.users.me}`, () => {
          return HttpResponse.error();
        }),
      );

      await expect(validateSession()).rejects.toThrow();
    });
  });

  describe('login', () => {
    it('returns true on successful login', async () => {
      mockSuccessfulLogin();

      const result = await login(251000001, 'password');

      expect(result).toBe(true);
    });

    it('returns false on failed login (does not throw)', async () => {
      mockFailedLogin();

      const result = await login(251000001, 'wrongpassword');

      expect(result).toBe(false);
    });
  });

  describe('logout', () => {
    it('calls sessionApi.logout', async () => {
      // Mock successful logout (returns void)
      mockServer.use(
        http.post('*/api/v1/auth/logout', () => {
          return new HttpResponse(null, { status: 204 });
        }),
      );

      await expect(logout()).resolves.not.toThrow();
    });
  });
});
