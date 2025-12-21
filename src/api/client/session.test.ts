import { describe, it, expect } from 'vitest';
import { sessionApi } from './session';
import { mockServer } from '@/api/mocks';
import { http, HttpResponse } from 'msw';
import { endpoints } from './endpoints';
import { ErrorCodes } from './errors';
import { createMockUser } from '@test/utils/mockFactories';

describe('sessionApi', () => {
  describe('current', () => {
    it('returns user when session is valid', async () => {
      const mockUser = createMockUser({
        id: 251000001,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'user',
        experienceLevel: 'beginner',
      });

      mockServer.use(
        http.get('*' + endpoints.session.current, () => {
          return HttpResponse.json({
            success: true,
            data: { user: mockUser },
          });
        }),
      );

      const result = await sessionApi.current();

      expect(result.user).toEqual(mockUser);
    });

    it('suppresses SESSION_INVALID error and returns {user: null}', async () => {
      mockServer.use(
        http.get('*' + endpoints.session.current, () => {
          return HttpResponse.json(
            {
              success: false,
              error: {
                code: ErrorCodes.SESSION_INVALID,
                message: 'Invalid session',
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
        http.get('*' + endpoints.session.current, () => {
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
        http.get('*' + endpoints.session.current, ({ request }) => {
          requestCredentials = request.credentials;
          return HttpResponse.json({
            success: true,
            data: { user: createMockUser() },
          });
        }),
      );

      await sessionApi.current();

      expect(requestCredentials).toBe('include');
    });

    it('handles network errors gracefully', async () => {
      mockServer.use(
        http.get('*' + endpoints.session.current, () => {
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
        http.post('*' + endpoints.session.login, () => {
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
        http.post('*' + endpoints.session.login, () => {
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
        http.post('*' + endpoints.session.login, async ({ request }) => {
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
        http.post('*' + endpoints.session.login, () => {
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
        http.post('*' + endpoints.session.logout, () => {
          return new HttpResponse(null, { status: 204 });
        }),
      );

      await expect(sessionApi.logout()).resolves.not.toThrow();
    });

    it('includes credentials in request', async () => {
      let requestCredentials: RequestCredentials | undefined;

      mockServer.use(
        http.post('*' + endpoints.session.logout, ({ request }) => {
          requestCredentials = request.credentials;
          return new HttpResponse(null, { status: 204 });
        }),
      );

      await sessionApi.logout();

      expect(requestCredentials).toBe('include');
    });

    it('handles logout errors', async () => {
      mockServer.use(
        http.post('*' + endpoints.session.logout, () => {
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
});
