// Update elevate-app/src/api/mocks/utils.ts
// Fix invalidSessionResponse for Safari

import { HttpResponse } from 'msw';
import { ErrorCodes } from '../client/errors';
import { ApiResponseError, GroupResponse } from '../types';
import { PERMISSION_CATALOG, PERMISSIONS } from '@/constants/permissions';
import type { UserPermission } from '@/types/user';
import type { User } from './database/types';

/**
 * Returns mock GroupResponse objects for the given group keys.
 */
export function mockGroupsForKeys(groupKeys: string[]): GroupResponse[] {
  const catalog: Record<string, GroupResponse> = {
    members: {
      id: 1,
      groupKey: 'members',
      name: 'Members',
      description: 'Default member group',
      isSystem: true,
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    regular_admins: {
      id: 3,
      groupKey: 'regular_admins',
      name: 'Regular Admins',
      description: 'Admin group for day-to-day operations. No IAM or audit access.',
      isSystem: true,
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    super_admins: {
      id: 2,
      groupKey: 'super_admins',
      name: 'Super Admins',
      description: 'Full access group',
      isSystem: true,
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
  };
  return groupKeys.map((key) => catalog[key]).filter(Boolean);
}

const SUPER_ADMIN_PERMISSIONS: UserPermission[] = PERMISSION_CATALOG.map((p) => ({
  key: p.key,
  scopeKey: 'any',
}));

const REGULAR_ADMIN_PERMISSIONS: UserPermission[] = PERMISSION_CATALOG.filter(
  (p) => p.resource !== 'iam' && p.resource !== 'audit',
).map((p) => ({ key: p.key, scopeKey: 'any' }));

const MEMBER_PERMISSIONS: UserPermission[] = [
  { key: PERMISSIONS.JOBS_CREATE, scopeKey: 'own' },
  { key: PERMISSIONS.JOBS_LIST, scopeKey: 'own' },
  { key: PERMISSIONS.JOBS_READ, scopeKey: 'own' },
  { key: PERMISSIONS.JOBS_DELETE, scopeKey: 'own' },
  { key: PERMISSIONS.JOBS_COMPLETE_UPLOAD, scopeKey: 'own' },
  { key: PERMISSIONS.JOBS_RETRY_UPLOAD, scopeKey: 'own' },
  { key: PERMISSIONS.JOBS_REORDER, scopeKey: 'own' },
  { key: PERMISSIONS.FILES_READ_METADATA, scopeKey: 'own' },
  { key: PERMISSIONS.FILES_DOWNLOAD, scopeKey: 'own' },
  { key: PERMISSIONS.USERS_UPDATE_PROFILE, scopeKey: 'own' },
];

export function mockPermissionsForGroups(groupKeys: string[]): UserPermission[] {
  if (groupKeys.includes('super_admins')) return SUPER_ADMIN_PERMISSIONS;
  if (groupKeys.includes('regular_admins')) return REGULAR_ADMIN_PERMISSIONS;
  if (groupKeys.includes('members')) return MEMBER_PERMISSIONS;
  return [];
}

export function mockUserHasPermission(user: User, permission: string, scopeKey?: string): boolean {
  return mockPermissionsForGroups(user.groups).some(
    (p) =>
      p.key === permission && (scopeKey === undefined || p.scopeKey === 'any' || p.scopeKey === scopeKey),
  );
}

export const generateSuccessResponse = (data: unknown) => {
  return {
    success: true,
    data,
  };
};

export const generateErrorResponse = (error: ApiResponseError) => {
  return {
    success: false,
    error,
  };
};

// Debug handler middleware
export const debugRequest = async (req: Request) => {
  console.log('\n=== MSW Request Debug ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);

  // Log headers
  console.log('\nHeaders:');
  for (const [key, value] of req.headers.entries()) {
    console.log(`${key}: ${value}`);
  }

  // Log body
  try {
    const clonedReq = req.clone(); // Clone request as body can only be read once
    const body = await clonedReq.text();
    console.log('\nBody (raw):', body);

    if (body) {
      try {
        const jsonBody = JSON.parse(body);
        console.log('Body (parsed):', JSON.stringify(jsonBody, null, 2));
      } catch {
        console.log('Body is not JSON:', body);
      }
    } else {
      console.log('No body content');
    }
  } catch (e) {
    console.log('Error reading body:', e);
  }

  console.log('\n=== End Debug ===\n');
};

/**
 * Creates a new invalid session response
 * Note: This must be a function that returns a new HttpResponse each time,
 * because HttpResponse streams can only be read once (ReadableStream limitation)
 */
export const createInvalidSessionResponse = () =>
  new HttpResponse(
    JSON.stringify(
      generateErrorResponse({
        code: ErrorCodes.SESSION_INVALID,
        message: 'Invalid session',
      }),
    ),
    {
      status: 403,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': `sessionToken=; path=/; max-age=0; SameSite=Strict`, // Remove the invalid cookie
      },
    },
  );
