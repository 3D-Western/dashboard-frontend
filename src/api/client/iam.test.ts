import { describe, it, expect, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { iamApi } from './iam';
import { endpoints } from './endpoints';
import { mockServer } from '@/api/mocks';

describe('iamApi', () => {
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
      global.fetch = vi.fn((url, options) => {
        capturedCredentials = options?.credentials;
        return originalFetch(url, options);
      });

      mockServer.use(
        http.get('*' + endpoints.iam.groups.users(7), () => {
          return HttpResponse.json({ success: true, data: response });
        }),
      );

      await iamApi.listGroupUsers(7);

      expect(capturedCredentials).toBe('include');
      global.fetch = originalFetch;
    });
  });
});
