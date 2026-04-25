import { describe, it, expect, vi } from 'vitest';
import { invitationApi } from './invitation';
import { mockServer } from '@/api/mocks';
import { http, HttpResponse } from 'msw';
import { endpoints } from './endpoints';
import {
  createMockPendingInvitation,
  createMockAcceptedInvitation,
  createMockRevokedInvitation,
} from '@test/utils/mockFactories';
import { ErrorCodes } from './errors';

describe('invitationApi', () => {
  describe('listInvitations', () => {
    it('returns paginated invitation list successfully', async () => {
      const mockInvitations = [
        createMockPendingInvitation({ studentId: 251000001, email: 'user1@uwo.ca' }),
        createMockAcceptedInvitation({ studentId: 251000002, email: 'user2@uwo.ca' }),
      ];
      const mockResponse = {
        data: mockInvitations,
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
        http.get('*' + endpoints.invitations.list, () => {
          return HttpResponse.json({
            success: true,
            data: mockResponse,
          });
        }),
      );

      const result = await invitationApi.listInvitations();

      expect(result.data).toHaveLength(2);
      expect(result.data[0].status).toBe('PENDING');
      expect(result.data[1].status).toBe('ACCEPTED');
      expect(result.pagination).toEqual(mockResponse.pagination);
    });

    it('includes studentId query parameter when provided', async () => {
      let capturedUrl: string | null = null;
      mockServer.use(
        http.get('*' + endpoints.invitations.list, ({ request }) => {
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

      await invitationApi.listInvitations({ studentId: 251000001 });

      expect(capturedUrl).toContain('studentId=251000001');
    });

    it('includes email query parameter when provided', async () => {
      let capturedUrl: string | null = null;
      mockServer.use(
        http.get('*' + endpoints.invitations.list, ({ request }) => {
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

      await invitationApi.listInvitations({ email: 'test@uwo.ca' });

      expect(capturedUrl).toContain('email=test%40uwo.ca');
    });

    it('includes status query parameter when provided', async () => {
      let capturedUrl: string | null = null;
      mockServer.use(
        http.get('*' + endpoints.invitations.list, ({ request }) => {
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

      await invitationApi.listInvitations({ status: 'PENDING' });

      expect(capturedUrl).toContain('status=PENDING');
    });

    it('includes page query parameter when provided', async () => {
      let capturedUrl: string | null = null;
      mockServer.use(
        http.get('*' + endpoints.invitations.list, ({ request }) => {
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

      await invitationApi.listInvitations({ page: 2 });

      expect(capturedUrl).toContain('page=2');
    });

    it('includes pageSize query parameter when provided', async () => {
      let capturedUrl: string | null = null;
      mockServer.use(
        http.get('*' + endpoints.invitations.list, ({ request }) => {
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

      await invitationApi.listInvitations({ pageSize: 25 });

      expect(capturedUrl).toContain('pageSize=25');
    });

    it('includes snapshotCreatedBefore query parameter when provided', async () => {
      let capturedUrl: string | null = null;
      mockServer.use(
        http.get('*' + endpoints.invitations.list, ({ request }) => {
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

      await invitationApi.listInvitations({ snapshotCreatedBefore: '2024-01-01T00:00:00Z' });

      expect(capturedUrl).toContain('snapshotCreatedBefore=2024-01-01T00%3A00%3A00Z');
    });

    it('includes multiple query parameters when provided', async () => {
      let capturedUrl: string | null = null;
      mockServer.use(
        http.get('*' + endpoints.invitations.list, ({ request }) => {
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

      await invitationApi.listInvitations({
        studentId: 251000001,
        email: 'test@uwo.ca',
        status: 'PENDING',
        page: 2,
        pageSize: 25,
      });

      expect(capturedUrl).toContain('studentId=251000001');
      expect(capturedUrl).toContain('email=test%40uwo.ca');
      expect(capturedUrl).toContain('status=PENDING');
      expect(capturedUrl).toContain('page=2');
      expect(capturedUrl).toContain('pageSize=25');
    });

    it('omits undefined query parameters', async () => {
      let capturedUrl: string | null = null;
      mockServer.use(
        http.get('*' + endpoints.invitations.list, ({ request }) => {
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

      await invitationApi.listInvitations({ page: 1 });

      expect(capturedUrl).toContain('page=1');
      expect(capturedUrl).not.toContain('studentId=');
      expect(capturedUrl).not.toContain('email=');
      expect(capturedUrl).not.toContain('status=');
    });

    it('includes credentials in request', async () => {
      let capturedCredentials: RequestCredentials | undefined;
      const originalFetch = global.fetch;
      vi.stubGlobal('fetch', vi.fn((url: Parameters<typeof fetch>[0], options: Parameters<typeof fetch>[1]) => {
        capturedCredentials = options?.credentials;
        return originalFetch(url, options);
      }));

      mockServer.use(
        http.get('*' + endpoints.invitations.list, () => {
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

      await invitationApi.listInvitations();

      expect(capturedCredentials).toBe('include');

      vi.unstubAllGlobals();
    });

    it('throws FORBIDDEN error for non-admin users', async () => {
      mockServer.use(
        http.get('*' + endpoints.invitations.list, () => {
          return HttpResponse.json({
            success: false,
            error: {
              code: ErrorCodes.FORBIDDEN,
              message: 'Admin access required',
            },
          });
        }),
      );

      await expect(invitationApi.listInvitations()).rejects.toMatchObject({
        code: ErrorCodes.FORBIDDEN,
      });
    });

    it('handles network errors', async () => {
      mockServer.use(
        http.get('*' + endpoints.invitations.list, () => {
          return HttpResponse.json({
            success: false,
            error: {
              code: ErrorCodes.REQUEST_FAILED,
              message: 'Network error',
            },
          });
        }),
      );

      await expect(invitationApi.listInvitations()).rejects.toMatchObject({
        code: ErrorCodes.REQUEST_FAILED,
      });
    });

    it('passes custom options to apiRequest', async () => {
      let capturedHeaders: Headers | null = null;
      mockServer.use(
        http.get('*' + endpoints.invitations.list, ({ request }) => {
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

      await invitationApi.listInvitations(undefined, {
        headers: { 'X-Custom-Header': 'test' },
      });

      expect((capturedHeaders as Headers | null)?.get('X-Custom-Header')).toBe('test');
    });
  });

  describe('getInvitation', () => {
    it('returns invitation by ID successfully', async () => {
      const mockInvitation = createMockPendingInvitation({
        id: 1,
        studentId: 251000001,
        email: 'test@uwo.ca',
      });

      mockServer.use(
        http.get('*' + endpoints.invitations.byId(1), () => {
          return HttpResponse.json({
            success: true,
            data: mockInvitation,
          });
        }),
      );

      const result = await invitationApi.getInvitation(1);

      expect(result.id).toBe(1);
      expect(result.studentId).toBe(251000001);
      expect(result.email).toBe('test@uwo.ca');
      expect(result.status).toBe('PENDING');
    });

    it('uses correct endpoint with invitation ID', async () => {
      let capturedUrl: string | null = null;
      mockServer.use(
        http.get('*' + endpoints.invitations.byId(123), ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({
            success: true,
            data: createMockPendingInvitation({ id: 123 }),
          });
        }),
      );

      await invitationApi.getInvitation(123);

      expect(capturedUrl).toContain('/api/v1/admin/invitations/123');
    });

    it('includes credentials in request', async () => {
      let capturedCredentials: RequestCredentials | undefined;
      const originalFetch = global.fetch;
      vi.stubGlobal('fetch', vi.fn((url: Parameters<typeof fetch>[0], options: Parameters<typeof fetch>[1]) => {
        capturedCredentials = options?.credentials;
        return originalFetch(url, options);
      }));

      mockServer.use(
        http.get('*' + endpoints.invitations.byId(1), () => {
          return HttpResponse.json({
            success: true,
            data: createMockPendingInvitation({ id: 1 }),
          });
        }),
      );

      await invitationApi.getInvitation(1);

      expect(capturedCredentials).toBe('include');

      vi.unstubAllGlobals();
    });

    it('throws INVITATION_NOT_FOUND error for non-existent invitation', async () => {
      mockServer.use(
        http.get('*' + endpoints.invitations.byId(999), () => {
          return HttpResponse.json({
            success: false,
            error: {
              code: ErrorCodes.INVITATION_NOT_FOUND,
              message: 'Invitation not found',
            },
          });
        }),
      );

      await expect(invitationApi.getInvitation(999)).rejects.toMatchObject({
        code: ErrorCodes.INVITATION_NOT_FOUND,
      });
    });

    it('throws FORBIDDEN error for non-admin users', async () => {
      mockServer.use(
        http.get('*' + endpoints.invitations.byId(1), () => {
          return HttpResponse.json({
            success: false,
            error: {
              code: ErrorCodes.FORBIDDEN,
              message: 'Admin access required',
            },
          });
        }),
      );

      await expect(invitationApi.getInvitation(1)).rejects.toMatchObject({
        code: ErrorCodes.FORBIDDEN,
      });
    });

    it('passes custom options to apiRequest', async () => {
      let capturedHeaders: Headers | null = null;
      mockServer.use(
        http.get('*' + endpoints.invitations.byId(1), ({ request }) => {
          capturedHeaders = request.headers;
          return HttpResponse.json({
            success: true,
            data: createMockPendingInvitation({ id: 1 }),
          });
        }),
      );

      await invitationApi.getInvitation(1, {
        headers: { 'X-Custom-Header': 'test' },
      });

      expect((capturedHeaders as Headers | null)?.get('X-Custom-Header')).toBe('test');
    });
  });

  describe('createInvitation', () => {
    it('creates invitation successfully', async () => {
      const requestData = {
        studentId: 251000001,
        email: 'newuser@uwo.ca',
        expiresInDays: 7,
      };
      const mockInvitation = createMockPendingInvitation({
        studentId: 251000001,
        email: 'newuser@uwo.ca',
      });

      mockServer.use(
        http.post('*' + endpoints.invitations.create, () => {
          return HttpResponse.json({
            success: true,
            data: mockInvitation,
          });
        }),
      );

      const result = await invitationApi.createInvitation(requestData);

      expect(result.studentId).toBe(251000001);
      expect(result.email).toBe('newuser@uwo.ca');
      expect(result.status).toBe('PENDING');
    });

    it('sends correct request body', async () => {
      let capturedBody: string | null = null;
      const requestData = {
        studentId: 251000001,
        email: 'test@uwo.ca',
        expiresInDays: 14,
      };

      mockServer.use(
        http.post('*' + endpoints.invitations.create, async ({ request }) => {
          capturedBody = await request.text();
          return HttpResponse.json({
            success: true,
            data: createMockPendingInvitation(),
          });
        }),
      );

      await invitationApi.createInvitation(requestData);

      expect(capturedBody).toBe(JSON.stringify(requestData));
    });

    it('includes Content-Type header', async () => {
      let capturedContentType: string | null = null;
      mockServer.use(
        http.post('*' + endpoints.invitations.create, ({ request }) => {
          capturedContentType = request.headers.get('Content-Type');
          return HttpResponse.json({
            success: true,
            data: createMockPendingInvitation(),
          });
        }),
      );

      await invitationApi.createInvitation({
        studentId: 251000001,
        email: 'test@uwo.ca',
      });

      expect(capturedContentType).toBe('application/json');
    });

    it('includes credentials in request', async () => {
      let capturedCredentials: RequestCredentials | undefined;
      const originalFetch = global.fetch;
      vi.stubGlobal('fetch', vi.fn((url: Parameters<typeof fetch>[0], options: Parameters<typeof fetch>[1]) => {
        capturedCredentials = options?.credentials;
        return originalFetch(url, options);
      }));

      mockServer.use(
        http.post('*' + endpoints.invitations.create, () => {
          return HttpResponse.json({
            success: true,
            data: createMockPendingInvitation(),
          });
        }),
      );

      await invitationApi.createInvitation({
        studentId: 251000001,
        email: 'test@uwo.ca',
      });

      expect(capturedCredentials).toBe('include');

      vi.unstubAllGlobals();
    });

    it('throws VALIDATION_FAILED for invalid data', async () => {
      mockServer.use(
        http.post('*' + endpoints.invitations.create, () => {
          return HttpResponse.json({
            success: false,
            error: {
              code: ErrorCodes.VALIDATION_FAILED,
              message: 'Invalid email format',
            },
          });
        }),
      );

      await expect(
        invitationApi.createInvitation({
          studentId: 251000001,
          email: 'invalid-email',
        }),
      ).rejects.toMatchObject({
        code: ErrorCodes.VALIDATION_FAILED,
      });
    });

    it('throws FORBIDDEN error for non-admin users', async () => {
      mockServer.use(
        http.post('*' + endpoints.invitations.create, () => {
          return HttpResponse.json({
            success: false,
            error: {
              code: ErrorCodes.FORBIDDEN,
              message: 'Admin access required',
            },
          });
        }),
      );

      await expect(
        invitationApi.createInvitation({
          studentId: 251000001,
          email: 'test@uwo.ca',
        }),
      ).rejects.toMatchObject({
        code: ErrorCodes.FORBIDDEN,
      });
    });

    it('throws INVITATION_ALREADY_EXISTS for duplicate invitation', async () => {
      mockServer.use(
        http.post('*' + endpoints.invitations.create, () => {
          return HttpResponse.json({
            success: false,
            error: {
              code: ErrorCodes.INVITATION_ALREADY_EXISTS,
              message: 'Invitation already exists',
            },
          });
        }),
      );

      await expect(
        invitationApi.createInvitation({
          studentId: 251000001,
          email: 'existing@uwo.ca',
        }),
      ).rejects.toMatchObject({
        code: ErrorCodes.INVITATION_ALREADY_EXISTS,
      });
    });

    it('passes custom options to apiRequest', async () => {
      let capturedHeaders: Headers | null = null;
      mockServer.use(
        http.post('*' + endpoints.invitations.create, ({ request }) => {
          capturedHeaders = request.headers;
          return HttpResponse.json({
            success: true,
            data: createMockPendingInvitation(),
          });
        }),
      );

      await invitationApi.createInvitation(
        {
          studentId: 251000001,
          email: 'test@uwo.ca',
        },
        {
          headers: { 'X-Custom-Header': 'test' },
        },
      );

      expect((capturedHeaders as Headers | null)?.get('X-Custom-Header')).toBe('test');
    });
  });

  describe('revokeInvitation', () => {
    it('revokes invitation successfully', async () => {
      const mockInvitation = createMockRevokedInvitation({
        id: 1,
        studentId: 251000001,
        email: 'test@uwo.ca',
      });

      mockServer.use(
        http.patch('*' + endpoints.invitations.revoke(1), () => {
          return HttpResponse.json({
            success: true,
            data: mockInvitation,
          });
        }),
      );

      const result = await invitationApi.revokeInvitation(1);

      expect(result.id).toBe(1);
      expect(result.status).toBe('REVOKED');
    });

    it('uses correct endpoint with invitation ID', async () => {
      let capturedUrl: string | null = null;
      mockServer.use(
        http.patch('*' + endpoints.invitations.revoke(123), ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({
            success: true,
            data: createMockRevokedInvitation({ id: 123 }),
          });
        }),
      );

      await invitationApi.revokeInvitation(123);

      expect(capturedUrl).toContain('/api/v1/admin/invitations/123/revoke');
    });

    it('includes credentials in request', async () => {
      let capturedCredentials: RequestCredentials | undefined;
      const originalFetch = global.fetch;
      vi.stubGlobal('fetch', vi.fn((url: Parameters<typeof fetch>[0], options: Parameters<typeof fetch>[1]) => {
        capturedCredentials = options?.credentials;
        return originalFetch(url, options);
      }));

      mockServer.use(
        http.patch('*' + endpoints.invitations.revoke(1), () => {
          return HttpResponse.json({
            success: true,
            data: createMockRevokedInvitation({ id: 1 }),
          });
        }),
      );

      await invitationApi.revokeInvitation(1);

      expect(capturedCredentials).toBe('include');

      vi.unstubAllGlobals();
    });

    it('throws INVITATION_NOT_FOUND error for non-existent invitation', async () => {
      mockServer.use(
        http.patch('*' + endpoints.invitations.revoke(999), () => {
          return HttpResponse.json({
            success: false,
            error: {
              code: ErrorCodes.INVITATION_NOT_FOUND,
              message: 'Invitation not found',
            },
          });
        }),
      );

      await expect(invitationApi.revokeInvitation(999)).rejects.toMatchObject({
        code: ErrorCodes.INVITATION_NOT_FOUND,
      });
    });

    it('throws INVITATION_ALREADY_REVOKED error when trying to revoke already revoked invitation', async () => {
      mockServer.use(
        http.patch('*' + endpoints.invitations.revoke(1), () => {
          return HttpResponse.json({
            success: false,
            error: {
              code: ErrorCodes.INVITATION_ALREADY_REVOKED,
              message: 'Invitation is already revoked',
            },
          });
        }),
      );

      await expect(invitationApi.revokeInvitation(1)).rejects.toMatchObject({
        code: ErrorCodes.INVITATION_ALREADY_REVOKED,
      });
    });

    it('throws FORBIDDEN error for non-admin users', async () => {
      mockServer.use(
        http.patch('*' + endpoints.invitations.revoke(1), () => {
          return HttpResponse.json({
            success: false,
            error: {
              code: ErrorCodes.FORBIDDEN,
              message: 'Admin access required',
            },
          });
        }),
      );

      await expect(invitationApi.revokeInvitation(1)).rejects.toMatchObject({
        code: ErrorCodes.FORBIDDEN,
      });
    });

    it('passes custom options to apiRequest', async () => {
      let capturedHeaders: Headers | null = null;
      mockServer.use(
        http.patch('*' + endpoints.invitations.revoke(1), ({ request }) => {
          capturedHeaders = request.headers;
          return HttpResponse.json({
            success: true,
            data: createMockRevokedInvitation({ id: 1 }),
          });
        }),
      );

      await invitationApi.revokeInvitation(1, {
        headers: { 'X-Custom-Header': 'test' },
      });

      expect((capturedHeaders as Headers | null)?.get('X-Custom-Header')).toBe('test');
    });
  });
});
