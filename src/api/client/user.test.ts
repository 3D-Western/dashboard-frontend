import { describe, it, expect, vi } from 'vitest';
import { userApi } from './user';
import { mockServer } from '@/api/mocks';
import { http, HttpResponse } from 'msw';
import { endpoints } from './endpoints';
import { createMockUserResponse } from '@test/utils/mockFactories';
import { ErrorCodes } from './errors';

describe('userApi', () => {
  describe('listAllUsers', () => {
    it('returns paginated user list successfully', async () => {
      const mockUserResponses = [
        createMockUserResponse({
          studentId: 251000001,
          firstName: 'John',
          lastName: 'Doe',
        }),
        createMockUserResponse({
          studentId: 251000002,
          firstName: 'Jane',
          lastName: 'Smith',
        }),
      ];
      const mockResponse = {
        data: mockUserResponses,
        pagination: {
          page: 1,
          pageSize: 10,
          totalItems: 2,
          totalPages: 1,
          hasNext: false,
          hasPrevious: false,
          snapshotCreatedBefore: new Date().toISOString(),
        },
      };

      mockServer.use(
        http.get('*' + endpoints.users.list, () => {
          return HttpResponse.json({
            success: true,
            data: mockResponse,
          });
        }),
      );

      const result = await userApi.listAllUsers();

      // Result should be transformed to frontend format
      expect(result.data).toHaveLength(2);
      expect(result.data[0].groups).toEqual([]);
      expect(result.data[1].groups).toEqual([]);
      expect(result.pagination).toEqual(mockResponse.pagination);
    });

    it('includes search query parameter when provided', async () => {
      let capturedUrl: string | null = null;
      mockServer.use(
        http.get('*' + endpoints.users.list, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({
            success: true,
            data: {
              data: [],
              pagination: {
                page: 1,
                pageSize: 10,
                totalItems: 0,
                totalPages: 0,
                hasNext: false,
                hasPrevious: false,
                snapshotCreatedBefore: new Date().toISOString(),
              },
            },
          });
        }),
      );

      await userApi.listAllUsers({ search: 'john' });

      expect(capturedUrl).toContain('search=john');
    });

    it('includes status query parameter when provided', async () => {
      let capturedUrl: string | null = null;
      mockServer.use(
        http.get('*' + endpoints.users.list, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({
            success: true,
            data: {
              data: [],
              pagination: {
                page: 1,
                pageSize: 10,
                totalItems: 0,
                totalPages: 0,
                hasNext: false,
                hasPrevious: false,
                snapshotCreatedBefore: new Date().toISOString(),
              },
            },
          });
        }),
      );

      await userApi.listAllUsers({ status: 'active' });

      expect(capturedUrl).toContain('status=active');
    });

    it('includes trainingLevel query parameter when provided', async () => {
      let capturedUrl: string | null = null;
      mockServer.use(
        http.get('*' + endpoints.users.list, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({
            success: true,
            data: {
              data: [],
              pagination: {
                page: 1,
                pageSize: 10,
                totalItems: 0,
                totalPages: 0,
                hasNext: false,
                hasPrevious: false,
                snapshotCreatedBefore: new Date().toISOString(),
              },
            },
          });
        }),
      );

      await userApi.listAllUsers({ trainingLevel: 'advanced' });

      expect(capturedUrl).toContain('trainingLevel=advanced');
    });

    it('includes experienceLevel query parameter when provided', async () => {
      let capturedUrl: string | null = null;
      mockServer.use(
        http.get('*' + endpoints.users.list, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({
            success: true,
            data: {
              data: [],
              pagination: {
                page: 1,
                pageSize: 10,
                totalItems: 0,
                totalPages: 0,
                hasNext: false,
                hasPrevious: false,
                snapshotCreatedBefore: new Date().toISOString(),
              },
            },
          });
        }),
      );

      await userApi.listAllUsers({ experienceLevel: 'beginner' });

      expect(capturedUrl).toContain('experienceLevel=beginner');
    });

    it('includes page query parameter when provided', async () => {
      let capturedUrl: string | null = null;
      mockServer.use(
        http.get('*' + endpoints.users.list, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({
            success: true,
            data: {
              data: [],
              pagination: {
                page: 2,
                pageSize: 10,
                totalItems: 0,
                totalPages: 3,
                hasNext: true,
                hasPrevious: true,
                snapshotCreatedBefore: new Date().toISOString(),
              },
            },
          });
        }),
      );

      await userApi.listAllUsers({ page: 2 });

      expect(capturedUrl).toContain('page=2');
    });

    it('includes pageSize query parameter when provided', async () => {
      let capturedUrl: string | null = null;
      mockServer.use(
        http.get('*' + endpoints.users.list, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({
            success: true,
            data: {
              data: [],
              pagination: {
                page: 1,
                pageSize: 25,
                totalItems: 0,
                totalPages: 0,
                hasNext: false,
                hasPrevious: false,
                snapshotCreatedBefore: new Date().toISOString(),
              },
            },
          });
        }),
      );

      await userApi.listAllUsers({ pageSize: 25 });

      expect(capturedUrl).toContain('pageSize=25');
    });

    it('includes snapshotCreatedBefore query parameter when provided', async () => {
      let capturedUrl: string | null = null;
      mockServer.use(
        http.get('*' + endpoints.users.list, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({
            success: true,
            data: {
              data: [],
              pagination: {
                page: 1,
                pageSize: 10,
                totalItems: 0,
                totalPages: 0,
                hasNext: false,
                hasPrevious: false,
                snapshotCreatedBefore: new Date().toISOString(),
              },
            },
          });
        }),
      );

      await userApi.listAllUsers({ snapshotCreatedBefore: '2024-01-01T00:00:00Z' });

      expect(capturedUrl).toContain('snapshotCreatedBefore=2024-01-01T00%3A00%3A00Z');
    });

    it('includes multiple query parameters when provided', async () => {
      let capturedUrl: string | null = null;
      mockServer.use(
        http.get('*' + endpoints.users.list, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({
            success: true,
            data: {
              data: [],
              pagination: {
                page: 1,
                pageSize: 10,
                totalItems: 0,
                totalPages: 0,
                hasNext: false,
                hasPrevious: false,
                snapshotCreatedBefore: new Date().toISOString(),
              },
            },
          });
        }),
      );

      await userApi.listAllUsers({
        search: 'john',
        status: 'active',
        page: 2,
        pageSize: 25,
      });

      expect(capturedUrl).toContain('search=john');
      expect(capturedUrl).toContain('status=active');
      expect(capturedUrl).toContain('page=2');
      expect(capturedUrl).toContain('pageSize=25');
    });

    it('omits undefined query parameters', async () => {
      let capturedUrl: string | null = null;
      mockServer.use(
        http.get('*' + endpoints.users.list, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({
            success: true,
            data: {
              data: [],
              pagination: {
                page: 1,
                pageSize: 10,
                totalItems: 0,
                totalPages: 0,
                hasNext: false,
                hasPrevious: false,
                snapshotCreatedBefore: new Date().toISOString(),
              },
            },
          });
        }),
      );

      await userApi.listAllUsers({ page: 1 });

      expect(capturedUrl).toContain('page=1');
      expect(capturedUrl).not.toContain('search=');
      expect(capturedUrl).not.toContain('status=');
    });

    it('includes credentials in request', async () => {
      let capturedCredentials: RequestCredentials | undefined;
      const originalFetch = global.fetch;
      global.fetch = vi.fn((url, options) => {
        capturedCredentials = options?.credentials;
        return originalFetch(url, options);
      });

      mockServer.use(
        http.get('*' + endpoints.users.list, () => {
          return HttpResponse.json({
            success: true,
            data: {
              data: [],
              pagination: {
                page: 1,
                pageSize: 10,
                totalItems: 0,
                totalPages: 0,
                hasNext: false,
                hasPrevious: false,
                snapshotCreatedBefore: new Date().toISOString(),
              },
            },
          });
        }),
      );

      await userApi.listAllUsers();

      expect(capturedCredentials).toBe('include');

      global.fetch = originalFetch;
    });

    it('throws FORBIDDEN error for non-admin users', async () => {
      mockServer.use(
        http.get('*' + endpoints.users.list, () => {
          return HttpResponse.json({
            success: false,
            error: {
              code: ErrorCodes.FORBIDDEN,
              message: 'Admin access required',
            },
          });
        }),
      );

      await expect(userApi.listAllUsers()).rejects.toMatchObject({
        code: ErrorCodes.FORBIDDEN,
      });
    });

    it('handles network errors', async () => {
      mockServer.use(
        http.get('*' + endpoints.users.list, () => {
          return HttpResponse.json({
            success: false,
            error: {
              code: ErrorCodes.REQUEST_FAILED,
              message: 'Network error',
            },
          });
        }),
      );

      await expect(userApi.listAllUsers()).rejects.toMatchObject({
        code: ErrorCodes.REQUEST_FAILED,
      });
    });

    it('passes custom options to apiRequest', async () => {
      let capturedHeaders: Headers | null = null;
      mockServer.use(
        http.get('*' + endpoints.users.list, ({ request }) => {
          capturedHeaders = request.headers;
          return HttpResponse.json({
            success: true,
            data: {
              data: [],
              pagination: {
                page: 1,
                pageSize: 10,
                totalItems: 0,
                totalPages: 0,
                hasNext: false,
                hasPrevious: false,
                snapshotCreatedBefore: new Date().toISOString(),
              },
            },
          });
        }),
      );

      await userApi.listAllUsers(undefined, {
        headers: { 'X-Custom-Header': 'test' },
      });

      expect((capturedHeaders as Headers | null)?.get('X-Custom-Header')).toBe('test');
    });
  });

  describe('getUserById', () => {
    it('returns user by ID successfully', async () => {
      const mockUserResponse = createMockUserResponse({
        studentId: 251000001,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        status: 'User',
      });

      mockServer.use(
        http.get('*' + endpoints.users.byId(251000001), () => {
          return HttpResponse.json({
            success: true,
            data: mockUserResponse,
          });
        }),
      );

      const result = await userApi.getUserById(251000001);

      // Result should be transformed to frontend format
      expect(result.studentId).toBe(251000001);
      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Doe');
      expect(result.email).toBe('john@example.com');
      expect(result.groups).toEqual([]);
    });

    it('uses correct endpoint with user ID', async () => {
      let capturedUrl: string | null = null;
      mockServer.use(
        http.get('*' + endpoints.users.byId(251000001), ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({
            success: true,
            data: createMockUserResponse({ studentId: 251000001 }),
          });
        }),
      );

      await userApi.getUserById(251000001);

      expect(capturedUrl).toContain('/api/v1/users/251000001');
    });

    it('includes credentials in request', async () => {
      let capturedCredentials: RequestCredentials | undefined;
      const originalFetch = global.fetch;
      global.fetch = vi.fn((url, options) => {
        capturedCredentials = options?.credentials;
        return originalFetch(url, options);
      });

      mockServer.use(
        http.get('*' + endpoints.users.byId(251000001), () => {
          return HttpResponse.json({
            success: true,
            data: createMockUserResponse({ studentId: 251000001 }),
          });
        }),
      );

      await userApi.getUserById(251000001);

      expect(capturedCredentials).toBe('include');

      global.fetch = originalFetch;
    });

    it('throws USER_NOT_FOUND error for non-existent user', async () => {
      mockServer.use(
        http.get('*' + endpoints.users.byId(999999999), () => {
          return HttpResponse.json({
            success: false,
            error: {
              code: ErrorCodes.USER_NOT_FOUND,
              message: 'User not found',
            },
          });
        }),
      );

      await expect(userApi.getUserById(999999999)).rejects.toMatchObject({
        code: ErrorCodes.USER_NOT_FOUND,
      });
    });

    it('throws FORBIDDEN error when accessing another user without permission', async () => {
      mockServer.use(
        http.get('*' + endpoints.users.byId(251000002), () => {
          return HttpResponse.json({
            success: false,
            error: {
              code: ErrorCodes.FORBIDDEN,
              message: 'Access denied',
            },
          });
        }),
      );

      await expect(userApi.getUserById(251000002)).rejects.toMatchObject({
        code: ErrorCodes.FORBIDDEN,
      });
    });

    it('passes custom options to apiRequest', async () => {
      let capturedHeaders: Headers | null = null;
      mockServer.use(
        http.get('*' + endpoints.users.byId(251000001), ({ request }) => {
          capturedHeaders = request.headers;
          return HttpResponse.json({
            success: true,
            data: createMockUserResponse({ studentId: 251000001 }),
          });
        }),
      );

      await userApi.getUserById(251000001, {
        headers: { 'X-Custom-Header': 'test' },
      });

      expect((capturedHeaders as Headers | null)?.get('X-Custom-Header')).toBe('test');
    });
  });

  describe('getCurrentUserJobs', () => {
    it('returns paginated print job list for current user successfully', async () => {
      const mockJobs = [
        { id: '1', name: 'Job 1', status: 'pending' },
        { id: '2', name: 'Job 2', status: 'in-progress' },
      ];
      const mockResponse = {
        data: mockJobs,
        pagination: {
          page: 1,
          pageSize: 10,
          totalItems: 2,
          totalPages: 1,
          hasNext: false,
          hasPrevious: false,
          snapshotCreatedBefore: new Date().toISOString(),
        },
      };

      mockServer.use(
        http.get('*' + endpoints.users.jobs, () => {
          return HttpResponse.json({
            success: true,
            data: mockResponse,
          });
        }),
      );

      const result = await userApi.getCurrentUserJobs();

      expect(result).toEqual(mockResponse);
      expect(result.data).toHaveLength(2);
    });

    it('includes status query parameter when provided', async () => {
      let capturedUrl: string | null = null;
      mockServer.use(
        http.get('*' + endpoints.users.jobs, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({
            success: true,
            data: {
              data: [],
              pagination: {
                page: 1,
                pageSize: 10,
                totalItems: 0,
                totalPages: 0,
                hasNext: false,
                hasPrevious: false,
                snapshotCreatedBefore: new Date().toISOString(),
              },
            },
          });
        }),
      );

      await userApi.getCurrentUserJobs({ status: 'completed' });

      expect(capturedUrl).toContain('status=completed');
    });

    it('includes search query parameter when provided', async () => {
      let capturedUrl: string | null = null;
      mockServer.use(
        http.get('*' + endpoints.users.jobs, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({
            success: true,
            data: {
              data: [],
              pagination: {
                page: 1,
                pageSize: 10,
                totalItems: 0,
                totalPages: 0,
                hasNext: false,
                hasPrevious: false,
                snapshotCreatedBefore: new Date().toISOString(),
              },
            },
          });
        }),
      );

      await userApi.getCurrentUserJobs({ search: 'test job' });

      expect(capturedUrl).toContain('search=test+job');
    });

    it('includes page query parameter when provided', async () => {
      let capturedUrl: string | null = null;
      mockServer.use(
        http.get('*' + endpoints.users.jobs, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({
            success: true,
            data: {
              data: [],
              pagination: {
                page: 2,
                pageSize: 10,
                totalItems: 0,
                totalPages: 3,
                hasNext: true,
                hasPrevious: true,
                snapshotCreatedBefore: new Date().toISOString(),
              },
            },
          });
        }),
      );

      await userApi.getCurrentUserJobs({ page: 2 });

      expect(capturedUrl).toContain('page=2');
    });

    it('includes pageSize query parameter when provided', async () => {
      let capturedUrl: string | null = null;
      mockServer.use(
        http.get('*' + endpoints.users.jobs, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({
            success: true,
            data: {
              data: [],
              pagination: {
                page: 1,
                pageSize: 25,
                totalItems: 0,
                totalPages: 0,
                hasNext: false,
                hasPrevious: false,
                snapshotCreatedBefore: new Date().toISOString(),
              },
            },
          });
        }),
      );

      await userApi.getCurrentUserJobs({ pageSize: 25 });

      expect(capturedUrl).toContain('pageSize=25');
    });

    it('includes snapshotCreatedBefore query parameter when provided', async () => {
      let capturedUrl: string | null = null;
      mockServer.use(
        http.get('*' + endpoints.users.jobs, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({
            success: true,
            data: {
              data: [],
              pagination: {
                page: 1,
                pageSize: 10,
                totalItems: 0,
                totalPages: 0,
                hasNext: false,
                hasPrevious: false,
                snapshotCreatedBefore: new Date().toISOString(),
              },
            },
          });
        }),
      );

      await userApi.getCurrentUserJobs({ snapshotCreatedBefore: '2024-01-01T00:00:00Z' });

      expect(capturedUrl).toContain('snapshotCreatedBefore=2024-01-01T00%3A00%3A00Z');
    });

    it('includes multiple query parameters when provided', async () => {
      let capturedUrl: string | null = null;
      mockServer.use(
        http.get('*' + endpoints.users.jobs, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({
            success: true,
            data: {
              data: [],
              pagination: {
                page: 1,
                pageSize: 10,
                totalItems: 0,
                totalPages: 0,
                hasNext: false,
                hasPrevious: false,
                snapshotCreatedBefore: new Date().toISOString(),
              },
            },
          });
        }),
      );

      await userApi.getCurrentUserJobs({
        status: 'pending',
        search: 'job',
        page: 2,
        pageSize: 25,
      });

      expect(capturedUrl).toContain('status=pending');
      expect(capturedUrl).toContain('search=job');
      expect(capturedUrl).toContain('page=2');
      expect(capturedUrl).toContain('pageSize=25');
    });

    it('omits undefined query parameters', async () => {
      let capturedUrl: string | null = null;
      mockServer.use(
        http.get('*' + endpoints.users.jobs, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({
            success: true,
            data: {
              data: [],
              pagination: {
                page: 1,
                pageSize: 10,
                totalItems: 0,
                totalPages: 0,
                hasNext: false,
                hasPrevious: false,
                snapshotCreatedBefore: new Date().toISOString(),
              },
            },
          });
        }),
      );

      await userApi.getCurrentUserJobs({ page: 1 });

      expect(capturedUrl).toContain('page=1');
      expect(capturedUrl).not.toContain('status=');
      expect(capturedUrl).not.toContain('search=');
    });

    it('includes credentials in request', async () => {
      let capturedCredentials: RequestCredentials | undefined;
      const originalFetch = global.fetch;
      global.fetch = vi.fn((url, options) => {
        capturedCredentials = options?.credentials;
        return originalFetch(url, options);
      });

      mockServer.use(
        http.get('*' + endpoints.users.jobs, () => {
          return HttpResponse.json({
            success: true,
            data: {
              data: [],
              pagination: {
                page: 1,
                pageSize: 10,
                totalItems: 0,
                totalPages: 0,
                hasNext: false,
                hasPrevious: false,
                snapshotCreatedBefore: new Date().toISOString(),
              },
            },
          });
        }),
      );

      await userApi.getCurrentUserJobs();

      expect(capturedCredentials).toBe('include');

      global.fetch = originalFetch;
    });

    it('throws FORBIDDEN error when user is not authenticated', async () => {
      mockServer.use(
        http.get('*' + endpoints.users.jobs, () => {
          return HttpResponse.json({
            success: false,
            error: {
              code: ErrorCodes.FORBIDDEN,
              message: 'Authentication required',
            },
          });
        }),
      );

      await expect(userApi.getCurrentUserJobs()).rejects.toMatchObject({
        code: ErrorCodes.FORBIDDEN,
      });
    });

    it('handles network errors', async () => {
      mockServer.use(
        http.get('*' + endpoints.users.jobs, () => {
          return HttpResponse.json({
            success: false,
            error: {
              code: ErrorCodes.REQUEST_FAILED,
              message: 'Network error',
            },
          });
        }),
      );

      await expect(userApi.getCurrentUserJobs()).rejects.toMatchObject({
        code: ErrorCodes.REQUEST_FAILED,
      });
    });

    it('passes custom options to apiRequest', async () => {
      let capturedHeaders: Headers | null = null;
      mockServer.use(
        http.get('*' + endpoints.users.jobs, ({ request }) => {
          capturedHeaders = request.headers;
          return HttpResponse.json({
            success: true,
            data: {
              data: [],
              pagination: {
                page: 1,
                pageSize: 10,
                totalItems: 0,
                totalPages: 0,
                hasNext: false,
                hasPrevious: false,
                snapshotCreatedBefore: new Date().toISOString(),
              },
            },
          });
        }),
      );

      await userApi.getCurrentUserJobs(undefined, {
        headers: { 'X-Custom-Header': 'test' },
      });

      expect((capturedHeaders as Headers | null)?.get('X-Custom-Header')).toBe('test');
    });
  });

  describe('changePassword', () => {
    it('changes password successfully', async () => {
      const mockResponse = { message: 'Password updated successfully' };
      mockServer.use(
        http.post('*' + endpoints.users.changePassword, () => {
          return HttpResponse.json({
            success: true,
            data: mockResponse,
          });
        }),
      );

      const result = await userApi.changePassword(
        'oldPassword123',
        'newPassword456',
        'newPassword456',
      );

      expect(result).toEqual(mockResponse);
    });

    it('sends correct request body', async () => {
      let capturedBody: unknown = null;
      mockServer.use(
        http.post('*' + endpoints.users.changePassword, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json({
            success: true,
            data: { message: 'Password updated successfully' },
          });
        }),
      );

      await userApi.changePassword('oldPassword123', 'newPassword456', 'newPassword456');

      expect(capturedBody).toEqual({
        currentPassword: 'oldPassword123',
        newPassword: 'newPassword456',
        confirmNewPassword: 'newPassword456',
        invalidateAllSessions: false,
      });
    });

    it('sends invalidateAllSessions when provided', async () => {
      let capturedBody: unknown = null;
      mockServer.use(
        http.post('*' + endpoints.users.changePassword, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json({
            success: true,
            data: { message: 'Password updated successfully' },
          });
        }),
      );

      await userApi.changePassword('oldPassword123', 'newPassword456', 'newPassword456', true);

      expect(capturedBody).toEqual({
        currentPassword: 'oldPassword123',
        newPassword: 'newPassword456',
        confirmNewPassword: 'newPassword456',
        invalidateAllSessions: true,
      });
    });

    it('uses POST method', async () => {
      let capturedMethod: string | null = null;
      mockServer.use(
        http.post('*' + endpoints.users.changePassword, ({ request }) => {
          capturedMethod = request.method;
          return HttpResponse.json({
            success: true,
            data: { message: 'Password updated successfully' },
          });
        }),
      );

      await userApi.changePassword('oldPassword123', 'newPassword456', 'newPassword456');

      expect(capturedMethod).toBe('POST');
    });

    it('includes credentials in request', async () => {
      let capturedCredentials: RequestCredentials | undefined;
      const originalFetch = global.fetch;
      global.fetch = vi.fn((url, options) => {
        capturedCredentials = options?.credentials;
        return originalFetch(url, options);
      });

      mockServer.use(
        http.post('*' + endpoints.users.changePassword, () => {
          return HttpResponse.json({
            success: true,
            data: { message: 'Password updated successfully' },
          });
        }),
      );

      await userApi.changePassword('oldPassword123', 'newPassword456', 'newPassword456');

      expect(capturedCredentials).toBe('include');

      global.fetch = originalFetch;
    });

    it('throws INVALID_CREDENTIALS error when current password is incorrect', async () => {
      mockServer.use(
        http.post('*' + endpoints.users.changePassword, () => {
          return HttpResponse.json({
            success: false,
            error: {
              code: ErrorCodes.INVALID_CREDENTIALS,
              message: 'Current password is incorrect',
            },
          });
        }),
      );

      await expect(
        userApi.changePassword('wrongPassword', 'newPassword456', 'newPassword456'),
      ).rejects.toMatchObject({
        code: ErrorCodes.INVALID_CREDENTIALS,
      });
    });

    it('throws VALIDATION_FAILED error when passwords do not match', async () => {
      mockServer.use(
        http.post('*' + endpoints.users.changePassword, () => {
          return HttpResponse.json({
            success: false,
            error: {
              code: ErrorCodes.VALIDATION_FAILED,
              message: 'Passwords do not match',
            },
          });
        }),
      );

      await expect(
        userApi.changePassword('oldPassword123', 'newPassword456', 'differentPassword789'),
      ).rejects.toMatchObject({
        code: ErrorCodes.VALIDATION_FAILED,
      });
    });

    it('throws VALIDATION_FAILED error when password is too short', async () => {
      mockServer.use(
        http.post('*' + endpoints.users.changePassword, () => {
          return HttpResponse.json({
            success: false,
            error: {
              code: ErrorCodes.VALIDATION_FAILED,
              message: 'Password must be at least 10 characters',
            },
          });
        }),
      );

      await expect(
        userApi.changePassword('oldPassword123', 'short', 'short'),
      ).rejects.toMatchObject({
        code: ErrorCodes.VALIDATION_FAILED,
      });
    });

    it('throws VALIDATION_FAILED error when new password is same as current password', async () => {
      mockServer.use(
        http.post('*' + endpoints.users.changePassword, () => {
          return HttpResponse.json({
            success: false,
            error: {
              code: ErrorCodes.VALIDATION_FAILED,
              message: 'New password must be different from current password',
            },
          });
        }),
      );

      await expect(
        userApi.changePassword('samePassword123', 'samePassword123', 'samePassword123'),
      ).rejects.toMatchObject({
        code: ErrorCodes.VALIDATION_FAILED,
      });
    });

    it('handles network errors', async () => {
      mockServer.use(
        http.post('*' + endpoints.users.changePassword, () => {
          return HttpResponse.json({
            success: false,
            error: {
              code: ErrorCodes.REQUEST_FAILED,
              message: 'Network error',
            },
          });
        }),
      );

      await expect(
        userApi.changePassword('oldPassword123', 'newPassword456', 'newPassword456'),
      ).rejects.toMatchObject({
        code: ErrorCodes.REQUEST_FAILED,
      });
    });

    it('passes custom options to apiRequest', async () => {
      let capturedHeaders: Headers | null = null;
      mockServer.use(
        http.post('*' + endpoints.users.changePassword, ({ request }) => {
          capturedHeaders = request.headers;
          return HttpResponse.json({
            success: true,
            data: { message: 'Password updated successfully' },
          });
        }),
      );

      await userApi.changePassword('oldPassword123', 'newPassword456', 'newPassword456', false, {
        headers: { 'X-Custom-Header': 'test' },
      });

      expect((capturedHeaders as Headers | null)?.get('X-Custom-Header')).toBe('test');
    });
  });
});
