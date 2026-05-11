import { describe, it, expect } from 'vitest';
import { sessionApi } from './session';
import { mockServer } from '@/api/mocks';
import { http, HttpResponse } from 'msw';
import { endpoints } from './endpoints';
import { ErrorCodes } from './errors';
import { createMockUserResponse } from '@test/utils/mockFactories';
import { hasPermission } from '@/types/user';

describe('sessionApi', () => {
  describe('current', () => {
    it('returns user when session is valid', async () => {
      const mockUserResponse = createMockUserResponse({
        studentId: 251000001,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      });

      mockServer.use(
        http.get('*' + endpoints.users.me, () => {
          return HttpResponse.json({
            success: true,
            data: { user: mockUserResponse, groups: [], activeJobCount: 0 },
          });
        }),
      );

      const result = await sessionApi.current();

      expect(result.user).toMatchObject({
        studentId: 251000001,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        groups: [],
        permissions: [],
      });
    });

    it('suppresses UNAUTHORIZED error and returns {user: null}', async () => {
      mockServer.use(
        http.get('*' + endpoints.users.me, () => {
          return HttpResponse.json(
            {
              success: false,
              error: {
                code: ErrorCodes.UNAUTHORIZED,
                message: 'No valid session',
              },
            },
            { status: 401 },
          );
        }),
      );

      const result = await sessionApi.current();

      expect(result.user).toBeNull();
    });

    it('throws error for non-SESSION_INVALID errors', async () => {
      mockServer.use(
        http.get('*' + endpoints.users.me, () => {
          return HttpResponse.json(
            {
              success: false,
              error: {
                code: 'SERVER_ERROR',
                message: 'Internal server error',
              },
            },
            { status: 500 },
          );
        }),
      );

      await expect(sessionApi.current()).rejects.toThrow();
    });

    it('includes credentials in request', async () => {
      let requestCredentials: RequestCredentials | undefined;

      mockServer.use(
        http.get('*' + endpoints.users.me, ({ request }) => {
          requestCredentials = request.credentials;
          return HttpResponse.json({
            success: true,
            data: { user: createMockUserResponse(), groups: [], activeJobCount: 0 },
          });
        }),
      );

      await sessionApi.current();

      expect(requestCredentials).toBe('include');
    });

    it('returns permissions as UserPermission objects so hasPermission works', async () => {
      const permissions = [
        { key: 'users:list', scopeKey: 'any' },
        { key: 'jobs:read', scopeKey: 'own' },
      ];

      mockServer.use(
        http.get('*' + endpoints.users.me, () =>
          HttpResponse.json({
            success: true,
            data: { user: createMockUserResponse(), groups: [], permissions, activeJobCount: 0 },
          }),
        ),
      );

      const { user } = await sessionApi.current();

      expect(user?.permissions).toEqual(permissions);
      // These would both be false if permissions were plain strings instead of {key, scopeKey} objects
      expect(hasPermission(user, 'users:list')).toBe(true);
      expect(hasPermission(user, 'jobs:read')).toBe(true);
      expect(hasPermission(user, 'users:create')).toBe(false);
    });

    it('gives members own-scoped permissions only', async () => {
      mockServer.use(
        http.get('*' + endpoints.users.me, () =>
          HttpResponse.json({
            success: true,
            data: {
              user: createMockUserResponse(),
              groups: [
                {
                  id: 1,
                  groupKey: 'members',
                  name: 'Members',
                  isSystem: true,
                  isActive: true,
                  createdAt: '',
                  updatedAt: '',
                },
              ],
              permissions: [{ key: 'jobs:read', scopeKey: 'own' }],
              activeJobCount: 0,
            },
          }),
        ),
      );

      const { user } = await sessionApi.current();

      expect(user?.permissions.every((p) => p.scopeKey === 'own')).toBe(true);
    });

    it('gives super admins any-scoped permissions', async () => {
      mockServer.use(
        http.get('*' + endpoints.users.me, () =>
          HttpResponse.json({
            success: true,
            data: {
              user: createMockUserResponse(),
              groups: [],
              permissions: [
                { key: 'users:list', scopeKey: 'any' },
                { key: 'iam:read', scopeKey: 'any' },
              ],
              activeJobCount: 0,
            },
          }),
        ),
      );

      const { user } = await sessionApi.current();

      expect(user?.permissions.every((p) => p.scopeKey === 'any')).toBe(true);
    });

    it('handles network errors gracefully', async () => {
      mockServer.use(
        http.get('*' + endpoints.users.me, () => {
          return HttpResponse.error();
        }),
      );

      await expect(sessionApi.current()).rejects.toThrow();
    });
  });

  describe('login', () => {
    it('successfully logs in with valid credentials', async () => {
      const expectedToken = 'mock-session-token';

      mockServer.use(
        http.post('*' + endpoints.auth.login, () => {
          return HttpResponse.json({
            success: true,
            data: { sessionToken: expectedToken },
          });
        }),
      );

      const result = await sessionApi.login(251000001, 'password123');

      expect(result).toHaveProperty('sessionToken');
      expect(result.sessionToken).toBe(expectedToken);
    });

    it('throws INVALID_CREDENTIALS error with invalid credentials', async () => {
      mockServer.use(
        http.post('*' + endpoints.auth.login, () => {
          return HttpResponse.json(
            {
              success: false,
              error: {
                code: ErrorCodes.INVALID_CREDENTIALS,
                message: 'Invalid student ID or password',
              },
            },
            { status: 401 },
          );
        }),
      );

      await expect(sessionApi.login(251000001, 'wrongpassword')).rejects.toThrow();
    });

    it('sends correct request body', async () => {
      let requestBody: unknown;

      mockServer.use(
        http.post('*' + endpoints.auth.login, async ({ request }) => {
          requestBody = await request.json();
          return HttpResponse.json({
            success: true,
            data: { sessionToken: 'token' },
          });
        }),
      );

      await sessionApi.login(251000123, 'testpassword');

      expect(requestBody).toEqual({
        studentId: 251000123,
        password: 'testpassword',
      });
    });

    it('handles server errors', async () => {
      mockServer.use(
        http.post('*' + endpoints.auth.login, () => {
          return HttpResponse.json(
            {
              success: false,
              error: {
                code: 'SERVER_ERROR',
                message: 'Internal server error',
              },
            },
            { status: 500 },
          );
        }),
      );

      await expect(sessionApi.login(251000001, 'password')).rejects.toThrow();
    });
  });

  describe('logout', () => {
    it('successfully logs out', async () => {
      mockServer.use(
        http.post('*' + endpoints.auth.logout, () => {
          return new HttpResponse(null, { status: 204 });
        }),
      );

      await expect(sessionApi.logout()).resolves.not.toThrow();
    });

    it('includes credentials in request', async () => {
      let requestCredentials: RequestCredentials | undefined;

      mockServer.use(
        http.post('*' + endpoints.auth.logout, ({ request }) => {
          requestCredentials = request.credentials;
          return new HttpResponse(null, { status: 204 });
        }),
      );

      await sessionApi.logout();

      expect(requestCredentials).toBe('include');
    });

    it('handles logout errors', async () => {
      mockServer.use(
        http.post('*' + endpoints.auth.logout, () => {
          return HttpResponse.json(
            {
              success: false,
              error: {
                code: 'SERVER_ERROR',
                message: 'Failed to logout',
              },
            },
            { status: 500 },
          );
        }),
      );

      await expect(sessionApi.logout()).rejects.toThrow();
    });
  });

  describe('verifyMfa', () => {
    it('sends correct request body and returns response', async () => {
      const expected = { verified: true };

      mockServer.use(
        http.post('*' + endpoints.mfa.verifyOtp, async ({ request }) => {
          const body = await request.json();
          expect(body).toEqual({ challengeId: 123, code: '123456' });
          return HttpResponse.json({
            success: true,
            data: expected,
          });
        }),
      );

      const result = await sessionApi.verifyMfa(123, '123456');

      expect(result).toEqual(expected);
    });
  });
});
