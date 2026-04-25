import { describe, it, expect, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { iamApi } from './iam';
import { endpoints } from './endpoints';
import { mockServer } from '@/api/mocks';
import type { IamRolePermission } from '@/types/iam';

describe('iamApi', () => {
  describe('listRolePermissions', () => {
    it('returns IamRolePermission objects each with a scopeKey', async () => {
      const mockPerms: IamRolePermission[] = [
        {
          key: 'users:list',
          scopeKey: 'any',
          description: 'List all users',
          isDangerous: false,
          isActive: true,
        },
        {
          key: 'jobs:read',
          scopeKey: 'own',
          description: 'Read job details',
          isDangerous: false,
          isActive: true,
        },
      ];

      mockServer.use(
        http.get('*' + endpoints.iam.roles.permissions(1), () =>
          HttpResponse.json({ success: true, data: mockPerms }),
        ),
      );

      const result = await iamApi.listRolePermissions(1);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('key', 'users:list');
      expect(result[0]).toHaveProperty('scopeKey', 'any');
      expect(result[1]).toHaveProperty('key', 'jobs:read');
      expect(result[1]).toHaveProperty('scopeKey', 'own');
    });
  });

  describe('replaceRolePermissions', () => {
    it('sends scopeKey in the request body', async () => {
      let capturedBody: unknown;

      mockServer.use(
        http.put('*' + endpoints.iam.roles.permissions(2), async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json({ success: true, data: [] });
        }),
      );

      await iamApi.replaceRolePermissions(2, {
        permissions: [{ permissionKey: 'users:list', scopeKey: 'own' }],
      });

      expect(capturedBody).toEqual({
        permissions: [{ permissionKey: 'users:list', scopeKey: 'own' }],
      });
    });

    it('returns IamRolePermission objects with the saved scopeKey', async () => {
      const savedPerms: IamRolePermission[] = [
        {
          key: 'users:list',
          scopeKey: 'own',
          description: 'List all users',
          isDangerous: false,
          isActive: true,
        },
      ];

      mockServer.use(
        http.put('*' + endpoints.iam.roles.permissions(2), () =>
          HttpResponse.json({ success: true, data: savedPerms }),
        ),
      );

      const result = await iamApi.replaceRolePermissions(2, {
        permissions: [{ permissionKey: 'users:list', scopeKey: 'own' }],
      });

      expect(result[0]).toHaveProperty('scopeKey', 'own');
    });
  });

  describe('listGroupUsers', () => {
    const response = {
      data: [
        {
          studentId: 251000001,
          email: 'member@uwo.ca',
          firstName: 'Group',
          lastName: 'Member',
          assignedAt: '2024-01-01T00:00:00Z',
        },
      ],
      pagination: {
        page: 2,
        pageSize: 10,
        totalItems: 11,
        totalPages: 2,
        hasNext: false,
        hasPrevious: true,
        snapshotCreatedBefore: '2024-01-02T00:00:00Z',
      },
    };

    it('returns paginated group members', async () => {
      mockServer.use(
        http.get('*' + endpoints.iam.groups.users(7), () => {
          return HttpResponse.json({ success: true, data: response });
        }),
      );

      const result = await iamApi.listGroupUsers(7);

      expect(result).toEqual(response);
      expect(result.data[0].studentId).toBe(251000001);
    });

    it('includes pagination, search, and snapshot query parameters', async () => {
      let capturedUrl: string | null = null;
      mockServer.use(
        http.get('*' + endpoints.iam.groups.users(7), ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ success: true, data: response });
        }),
      );

      await iamApi.listGroupUsers(7, {
        page: 2,
        pageSize: 10,
        search: 'member',
        snapshotCreatedBefore: '2024-01-02T00:00:00Z',
      });

      expect(capturedUrl).toContain('/api/v1/admin/iam/groups/7/users');
      expect(capturedUrl).toContain('page=2');
      expect(capturedUrl).toContain('pageSize=10');
      expect(capturedUrl).toContain('search=member');
      expect(capturedUrl).toContain('snapshotCreatedBefore=2024-01-02T00%3A00%3A00Z');
    });

    it('includes credentials in request', async () => {
      let capturedCredentials: RequestCredentials | undefined;
      const originalFetch = global.fetch;
      vi.stubGlobal('fetch', vi.fn((url: Parameters<typeof fetch>[0], options: Parameters<typeof fetch>[1]) => {
        capturedCredentials = options?.credentials;
        return originalFetch(url, options);
      }));

      mockServer.use(
        http.get('*' + endpoints.iam.groups.users(7), () => {
          return HttpResponse.json({ success: true, data: response });
        }),
      );

      await iamApi.listGroupUsers(7);

      expect(capturedCredentials).toBe('include');
      vi.unstubAllGlobals();
    });
  });
});
