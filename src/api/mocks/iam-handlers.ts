import { http, HttpResponse } from 'msw';
import { endpoints } from '../client/endpoints';
import db from './database/db';
import {
  createInvalidSessionResponse,
  generateSuccessResponse,
  generateErrorResponse,
  mockUserHasPermission,
} from './utils';
import { ErrorCodes } from '../client/errors';
import {
  IamRole,
  IamGroup,
  IamPermission,
  IamAuditLog,
  CreateIamRoleRequest,
  UpdateIamRoleRequest,
  CreateIamGroupRequest,
  UpdateIamGroupRequest,
  ReplaceRolePermissionsRequest,
} from '@/types/iam';
import { PERMISSION_CATALOG, PERMISSIONS as PERMISSION_KEYS } from '@/constants/permissions';

const apiUrl = process.env.API_URL;

const NOT_FOUND = 'NOT_FOUND';
const CONFLICT = 'CONFLICT';
const FORBIDDEN = 'FORBIDDEN';

// ── Static permission catalog ─────────────────────────────────────────────────

const PERMISSIONS: IamPermission[] = PERMISSION_CATALOG.map((permission) => ({
  key: permission.key,
  description: permission.description,
  isDangerous: permission.isDangerous ?? false,
  isActive: true,
}));

// ── Seed data ─────────────────────────────────────────────────────────────────

const mockRoles: IamRole[] = [
  {
    id: 1,
    roleKey: 'super_admin_role',
    name: 'Super Admin',
    description: 'Full system access',
    isSystem: true,
    isActive: true,
    createdAt: new Date('2024-01-01').toISOString(),
    updatedAt: new Date('2024-01-01').toISOString(),
  },
  {
    id: 2,
    roleKey: 'regular_admin_role',
    name: 'Regular Admin',
    description: 'Admin access for day-to-day operations. No IAM or audit access.',
    isSystem: false,
    isActive: true,
    createdAt: new Date('2024-01-01').toISOString(),
    updatedAt: new Date('2024-01-01').toISOString(),
  },
  {
    id: 3,
    roleKey: 'member_role',
    name: 'Member',
    description: 'Standard member access',
    isSystem: true,
    isActive: true,
    createdAt: new Date('2024-01-01').toISOString(),
    updatedAt: new Date('2024-01-01').toISOString(),
  },
];

const mockGroups: IamGroup[] = [
  {
    id: 1,
    groupKey: 'super_admins',
    name: 'Super Admins',
    description: 'Administrators with full access',
    isSystem: true,
    isActive: true,
    createdAt: new Date('2024-01-01').toISOString(),
    updatedAt: new Date('2024-01-01').toISOString(),
  },
  {
    id: 2,
    groupKey: 'regular_admins',
    name: 'Regular Admins',
    description: 'Admin group for day-to-day operations. No IAM or audit access.',
    isSystem: true,
    isActive: true,
    createdAt: new Date('2024-01-01').toISOString(),
    updatedAt: new Date('2024-01-01').toISOString(),
  },
  {
    id: 3,
    groupKey: 'members',
    name: 'Members',
    description: 'Standard registered members',
    isSystem: true,
    isActive: true,
    createdAt: new Date('2024-01-01').toISOString(),
    updatedAt: new Date('2024-01-01').toISOString(),
  },
];

// groupId → roleIds
const groupRoles: Map<number, number[]> = new Map([
  [1, [1]],
  [2, [2]],
  [3, [3]],
]);

// roleId → role permissions
const regularAdminPermissions = PERMISSIONS.filter(
  (p) => !p.key.startsWith('iam:') && p.key !== PERMISSION_KEYS.AUDIT_READ,
);
const memberPermissionKeys = new Set<IamPermission['key']>([
  PERMISSION_KEYS.JOBS_CREATE,
  PERMISSION_KEYS.JOBS_READ,
  PERMISSION_KEYS.JOBS_LIST,
  PERMISSION_KEYS.JOBS_UPDATE_STATUS,
  PERMISSION_KEYS.JOBS_DELETE,
  PERMISSION_KEYS.JOBS_COMPLETE_UPLOAD,
  PERMISSION_KEYS.JOBS_RETRY_UPLOAD,
  PERMISSION_KEYS.JOBS_REORDER,
  PERMISSION_KEYS.FILES_READ_METADATA,
  PERMISSION_KEYS.FILES_DOWNLOAD,
  PERMISSION_KEYS.FILES_LIST,
  PERMISSION_KEYS.USERS_READ,
  PERMISSION_KEYS.USERS_UPDATE_PROFILE,
]);

const rolePermissions: Map<number, IamPermission[]> = new Map([
  [1, [...PERMISSIONS]],
  [2, regularAdminPermissions],
  [3, PERMISSIONS.filter((p) => memberPermissionKeys.has(p.key))],
]);

// userId → direct roleIds
const userDirectRoles: Map<number, number[]> = new Map();

const mockAuditLogs: IamAuditLog[] = [];

let nextRoleId = 4;
let nextGroupId = 4;

// ── Helper ─────────────────────────────────────────────────────────────────────

function requireAdmin(cookies: Record<string, string>) {
  const sessionId = cookies['sessionToken'] || '';
  const user = db.validateSession(sessionId);
  if (!user) return { error: createInvalidSessionResponse() };
  if (!mockUserHasPermission(user, PERMISSION_KEYS.IAM_READ)) {
    return {
      error: HttpResponse.json(
        generateErrorResponse({ code: FORBIDDEN, message: 'Insufficient permissions' }),
        { status: 403 },
      ),
    };
  }
  return { user };
}

function applyActiveOnly(items: { isActive: boolean }[], activeOnly: boolean) {
  return activeOnly ? items.filter((i) => i.isActive) : items;
}

// ── Handlers ───────────────────────────────────────────────────────────────────

export const iamHandlers = [
  // GET /permissions
  http.get(`${apiUrl}${endpoints.iam.permissions}`, ({ cookies }) => {
    const { error } = requireAdmin(cookies);
    if (error) return error;
    return HttpResponse.json(generateSuccessResponse(PERMISSIONS));
  }),

  // GET /roles
  http.get(`${apiUrl}${endpoints.iam.roles.list}`, ({ cookies, request }) => {
    const { error } = requireAdmin(cookies);
    if (error) return error;
    const url = new URL(request.url);
    const activeOnly = url.searchParams.get('activeOnly') !== 'false';
    return HttpResponse.json(generateSuccessResponse(applyActiveOnly(mockRoles, activeOnly)));
  }),

  // GET /roles/:id
  http.get(`${apiUrl}/api/v1/admin/iam/roles/:id`, ({ cookies, params }) => {
    const { error } = requireAdmin(cookies);
    if (error) return error;
    const role = mockRoles.find((r) => r.id === parseInt(params.id as string, 10));
    if (!role) {
      return HttpResponse.json(
        generateErrorResponse({ code: NOT_FOUND, message: 'Role not found' }),
        { status: 404 },
      );
    }
    return HttpResponse.json(generateSuccessResponse(role));
  }),

  // POST /roles
  http.post(`${apiUrl}${endpoints.iam.roles.create}`, async ({ cookies, request }) => {
    const { error } = requireAdmin(cookies);
    if (error) return error;
    const data = (await request.json()) as CreateIamRoleRequest;
    if (!data.roleKey || !data.name) {
      return HttpResponse.json(
        generateErrorResponse({
          code: ErrorCodes.VALIDATION_FAILED,
          message: 'roleKey and name are required',
        }),
        { status: 400 },
      );
    }
    if (mockRoles.some((r) => r.roleKey === data.roleKey)) {
      return HttpResponse.json(
        generateErrorResponse({ code: CONFLICT, message: `Role '${data.roleKey}' already exists` }),
        { status: 409 },
      );
    }
    const now = new Date().toISOString();
    const role: IamRole = {
      id: nextRoleId++,
      roleKey: data.roleKey,
      name: data.name,
      description: data.description ?? null,
      isSystem: false,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    mockRoles.push(role);
    rolePermissions.set(role.id, []);
    return HttpResponse.json(generateSuccessResponse(role), { status: 201 });
  }),

  // PATCH /roles/:id
  http.patch(`${apiUrl}/api/v1/admin/iam/roles/:id`, async ({ cookies, params, request }) => {
    const { error } = requireAdmin(cookies);
    if (error) return error;
    const role = mockRoles.find((r) => r.id === parseInt(params.id as string, 10));
    if (!role) {
      return HttpResponse.json(
        generateErrorResponse({ code: NOT_FOUND, message: 'Role not found' }),
        { status: 404 },
      );
    }
    if (role.isSystem) {
      return HttpResponse.json(
        generateErrorResponse({ code: FORBIDDEN, message: 'System roles cannot be modified' }),
        { status: 403 },
      );
    }
    const data = (await request.json()) as UpdateIamRoleRequest;
    if (data.name !== undefined) role.name = data.name;
    if (data.description !== undefined) role.description = data.description;
    if (data.isActive !== undefined) role.isActive = data.isActive;
    role.updatedAt = new Date().toISOString();
    return HttpResponse.json(generateSuccessResponse(role));
  }),

  // DELETE /roles/:id (deactivate)
  http.delete(`${apiUrl}/api/v1/admin/iam/roles/:id`, ({ cookies, params }) => {
    const { error } = requireAdmin(cookies);
    if (error) return error;
    const role = mockRoles.find((r) => r.id === parseInt(params.id as string, 10));
    if (!role) {
      return HttpResponse.json(
        generateErrorResponse({ code: NOT_FOUND, message: 'Role not found' }),
        { status: 404 },
      );
    }
    if (role.isSystem) {
      return HttpResponse.json(
        generateErrorResponse({ code: FORBIDDEN, message: 'System roles cannot be deactivated' }),
        { status: 403 },
      );
    }
    role.isActive = false;
    role.updatedAt = new Date().toISOString();
    return HttpResponse.json(generateSuccessResponse(null));
  }),

  // GET /roles/:id/permissions
  http.get(`${apiUrl}/api/v1/admin/iam/roles/:id/permissions`, ({ cookies, params }) => {
    const { error } = requireAdmin(cookies);
    if (error) return error;
    const id = parseInt(params.id as string, 10);
    if (!mockRoles.find((r) => r.id === id)) {
      return HttpResponse.json(
        generateErrorResponse({ code: NOT_FOUND, message: 'Role not found' }),
        { status: 404 },
      );
    }
    return HttpResponse.json(generateSuccessResponse(rolePermissions.get(id) ?? []));
  }),

  // PUT /roles/:id/permissions
  http.put(
    `${apiUrl}/api/v1/admin/iam/roles/:id/permissions`,
    async ({ cookies, params, request }) => {
      const { error } = requireAdmin(cookies);
      if (error) return error;
      const id = parseInt(params.id as string, 10);
      const role = mockRoles.find((r) => r.id === id);
      if (!role) {
        return HttpResponse.json(
          generateErrorResponse({ code: NOT_FOUND, message: 'Role not found' }),
          { status: 404 },
        );
      }
      if (role.isSystem) {
        return HttpResponse.json(
          generateErrorResponse({
            code: FORBIDDEN,
            message: 'System role permissions cannot be modified',
          }),
          { status: 403 },
        );
      }
      const { permissions } = (await request.json()) as ReplaceRolePermissionsRequest;
      const updated: IamPermission[] = permissions.map((entry) => {
        const perm = PERMISSIONS.find((p) => p.key === entry.permissionKey);
        return {
          key: entry.permissionKey,
          description: perm?.description ?? entry.permissionKey,
          isDangerous: perm?.isDangerous ?? false,
          isActive: perm?.isActive ?? true,
        };
      });
      rolePermissions.set(id, updated);
      return HttpResponse.json(generateSuccessResponse(updated));
    },
  ),

  // GET /groups
  http.get(`${apiUrl}${endpoints.iam.groups.list}`, ({ cookies, request }) => {
    const { error } = requireAdmin(cookies);
    if (error) return error;
    const url = new URL(request.url);
    const activeOnly = url.searchParams.get('activeOnly') !== 'false';
    return HttpResponse.json(generateSuccessResponse(applyActiveOnly(mockGroups, activeOnly)));
  }),

  // GET /groups/:id
  http.get(`${apiUrl}/api/v1/admin/iam/groups/:id`, ({ cookies, params }) => {
    const { error } = requireAdmin(cookies);
    if (error) return error;
    const group = mockGroups.find((g) => g.id === parseInt(params.id as string, 10));
    if (!group) {
      return HttpResponse.json(
        generateErrorResponse({ code: NOT_FOUND, message: 'Group not found' }),
        { status: 404 },
      );
    }
    return HttpResponse.json(generateSuccessResponse(group));
  }),

  // POST /groups
  http.post(`${apiUrl}${endpoints.iam.groups.create}`, async ({ cookies, request }) => {
    const { error } = requireAdmin(cookies);
    if (error) return error;
    const data = (await request.json()) as CreateIamGroupRequest;
    if (!data.groupKey || !data.name) {
      return HttpResponse.json(
        generateErrorResponse({
          code: ErrorCodes.VALIDATION_FAILED,
          message: 'groupKey and name are required',
        }),
        { status: 400 },
      );
    }
    if (mockGroups.some((g) => g.groupKey === data.groupKey)) {
      return HttpResponse.json(
        generateErrorResponse({
          code: CONFLICT,
          message: `Group '${data.groupKey}' already exists`,
        }),
        { status: 409 },
      );
    }
    const now = new Date().toISOString();
    const group: IamGroup = {
      id: nextGroupId++,
      groupKey: data.groupKey,
      name: data.name,
      description: data.description ?? null,
      isSystem: false,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    mockGroups.push(group);
    groupRoles.set(group.id, []);
    return HttpResponse.json(generateSuccessResponse(group), { status: 201 });
  }),

  // PATCH /groups/:id
  http.patch(`${apiUrl}/api/v1/admin/iam/groups/:id`, async ({ cookies, params, request }) => {
    const { error } = requireAdmin(cookies);
    if (error) return error;
    const group = mockGroups.find((g) => g.id === parseInt(params.id as string, 10));
    if (!group) {
      return HttpResponse.json(
        generateErrorResponse({ code: NOT_FOUND, message: 'Group not found' }),
        { status: 404 },
      );
    }
    if (group.isSystem) {
      return HttpResponse.json(
        generateErrorResponse({ code: FORBIDDEN, message: 'System groups cannot be modified' }),
        { status: 403 },
      );
    }
    const data = (await request.json()) as UpdateIamGroupRequest;
    if (data.name !== undefined) group.name = data.name;
    if (data.description !== undefined) group.description = data.description;
    if (data.isActive !== undefined) group.isActive = data.isActive;
    group.updatedAt = new Date().toISOString();
    return HttpResponse.json(generateSuccessResponse(group));
  }),

  // DELETE /groups/:id (deactivate)
  http.delete(`${apiUrl}/api/v1/admin/iam/groups/:id`, ({ cookies, params }) => {
    const { error } = requireAdmin(cookies);
    if (error) return error;
    const group = mockGroups.find((g) => g.id === parseInt(params.id as string, 10));
    if (!group) {
      return HttpResponse.json(
        generateErrorResponse({ code: NOT_FOUND, message: 'Group not found' }),
        { status: 404 },
      );
    }
    if (group.isSystem) {
      return HttpResponse.json(
        generateErrorResponse({ code: FORBIDDEN, message: 'System groups cannot be deactivated' }),
        { status: 403 },
      );
    }
    group.isActive = false;
    group.updatedAt = new Date().toISOString();
    return HttpResponse.json(generateSuccessResponse(null));
  }),

  // GET /groups/:id/roles
  http.get(`${apiUrl}/api/v1/admin/iam/groups/:id/roles`, ({ cookies, params }) => {
    const { error } = requireAdmin(cookies);
    if (error) return error;
    const id = parseInt(params.id as string, 10);
    if (!mockGroups.find((g) => g.id === id)) {
      return HttpResponse.json(
        generateErrorResponse({ code: NOT_FOUND, message: 'Group not found' }),
        { status: 404 },
      );
    }
    const roleIds = groupRoles.get(id) ?? [];
    const roles = roleIds
      .map((rid) => mockRoles.find((r) => r.id === rid))
      .filter(Boolean) as IamRole[];
    return HttpResponse.json(generateSuccessResponse(roles));
  }),

  // POST /groups/:id/roles
  http.post(`${apiUrl}/api/v1/admin/iam/groups/:id/roles`, async ({ cookies, params, request }) => {
    const { error } = requireAdmin(cookies);
    if (error) return error;
    const id = parseInt(params.id as string, 10);
    if (!mockGroups.find((g) => g.id === id)) {
      return HttpResponse.json(
        generateErrorResponse({ code: NOT_FOUND, message: 'Group not found' }),
        { status: 404 },
      );
    }
    const { roleId } = (await request.json()) as { roleId: number };
    const role = mockRoles.find((r) => r.id === roleId);
    if (!role) {
      return HttpResponse.json(
        generateErrorResponse({ code: NOT_FOUND, message: 'Role not found' }),
        { status: 404 },
      );
    }
    const current = groupRoles.get(id) ?? [];
    if (!current.includes(roleId)) current.push(roleId);
    groupRoles.set(id, current);
    return HttpResponse.json(generateSuccessResponse(role), { status: 201 });
  }),

  // DELETE /groups/:id/roles/:roleId
  http.delete(`${apiUrl}/api/v1/admin/iam/groups/:id/roles/:roleId`, ({ cookies, params }) => {
    const { error } = requireAdmin(cookies);
    if (error) return error;
    const id = parseInt(params.id as string, 10);
    const roleId = parseInt(params.roleId as string, 10);
    const current = groupRoles.get(id) ?? [];
    groupRoles.set(
      id,
      current.filter((rid) => rid !== roleId),
    );
    return HttpResponse.json(generateSuccessResponse(null));
  }),

  // GET /users/:userId/groups
  http.get(`${apiUrl}/api/v1/admin/iam/users/:userId/groups`, ({ cookies, params }) => {
    const { error } = requireAdmin(cookies);
    if (error) return error;
    const userId = parseInt(params.userId as string, 10);
    const user = db.getUserById(userId);
    if (!user) {
      return HttpResponse.json(
        generateErrorResponse({ code: NOT_FOUND, message: 'User not found' }),
        { status: 404 },
      );
    }
    const groups = mockGroups.filter((g) => user.groups.includes(g.groupKey));
    return HttpResponse.json(generateSuccessResponse(groups));
  }),

  // POST /users/:userId/groups
  http.post(
    `${apiUrl}/api/v1/admin/iam/users/:userId/groups`,
    async ({ cookies, params, request }) => {
      const { error } = requireAdmin(cookies);
      if (error) return error;
      const userId = parseInt(params.userId as string, 10);
      const user = db.getUserById(userId);
      if (!user) {
        return HttpResponse.json(
          generateErrorResponse({ code: NOT_FOUND, message: 'User not found' }),
          { status: 404 },
        );
      }
      const { groupId } = (await request.json()) as { groupId: number };
      const group = mockGroups.find((g) => g.id === groupId);
      if (!group) {
        return HttpResponse.json(
          generateErrorResponse({ code: NOT_FOUND, message: 'Group not found' }),
          { status: 404 },
        );
      }
      if (!user.groups.includes(group.groupKey)) user.groups.push(group.groupKey);
      return HttpResponse.json(generateSuccessResponse(group), { status: 201 });
    },
  ),

  // DELETE /users/:userId/groups/:groupId
  http.delete(`${apiUrl}/api/v1/admin/iam/users/:userId/groups/:groupId`, ({ cookies, params }) => {
    const { error } = requireAdmin(cookies);
    if (error) return error;
    const userId = parseInt(params.userId as string, 10);
    const groupId = parseInt(params.groupId as string, 10);
    const user = db.getUserById(userId);
    if (!user) {
      return HttpResponse.json(
        generateErrorResponse({ code: NOT_FOUND, message: 'User not found' }),
        { status: 404 },
      );
    }
    const group = mockGroups.find((g) => g.id === groupId);
    if (group) {
      user.groups = user.groups.filter((gk) => gk !== group.groupKey);
    }
    return HttpResponse.json(generateSuccessResponse(null));
  }),

  // GET /users/:userId/roles
  http.get(`${apiUrl}/api/v1/admin/iam/users/:userId/roles`, ({ cookies, params }) => {
    const { error } = requireAdmin(cookies);
    if (error) return error;
    const userId = parseInt(params.userId as string, 10);
    if (!db.getUserById(userId)) {
      return HttpResponse.json(
        generateErrorResponse({ code: NOT_FOUND, message: 'User not found' }),
        { status: 404 },
      );
    }
    const roleIds = userDirectRoles.get(userId) ?? [];
    const roles = roleIds
      .map((rid) => mockRoles.find((r) => r.id === rid))
      .filter(Boolean) as IamRole[];
    return HttpResponse.json(generateSuccessResponse(roles));
  }),

  // POST /users/:userId/roles
  http.post(
    `${apiUrl}/api/v1/admin/iam/users/:userId/roles`,
    async ({ cookies, params, request }) => {
      const { error } = requireAdmin(cookies);
      if (error) return error;
      const userId = parseInt(params.userId as string, 10);
      if (!db.getUserById(userId)) {
        return HttpResponse.json(
          generateErrorResponse({ code: NOT_FOUND, message: 'User not found' }),
          { status: 404 },
        );
      }
      const { roleId } = (await request.json()) as { roleId: number };
      const role = mockRoles.find((r) => r.id === roleId);
      if (!role) {
        return HttpResponse.json(
          generateErrorResponse({ code: NOT_FOUND, message: 'Role not found' }),
          { status: 404 },
        );
      }
      const current = userDirectRoles.get(userId) ?? [];
      if (!current.includes(roleId)) current.push(roleId);
      userDirectRoles.set(userId, current);
      return HttpResponse.json(generateSuccessResponse(role), { status: 201 });
    },
  ),

  // DELETE /users/:userId/roles/:roleId
  http.delete(`${apiUrl}/api/v1/admin/iam/users/:userId/roles/:roleId`, ({ cookies, params }) => {
    const { error } = requireAdmin(cookies);
    if (error) return error;
    const userId = parseInt(params.userId as string, 10);
    const roleId = parseInt(params.roleId as string, 10);
    const current = userDirectRoles.get(userId) ?? [];
    userDirectRoles.set(
      userId,
      current.filter((rid) => rid !== roleId),
    );
    return HttpResponse.json(generateSuccessResponse(null));
  }),

  // GET /groups/:id/users
  http.get(`${apiUrl}/api/v1/admin/iam/groups/:id/users`, ({ cookies, params, request }) => {
    const { error } = requireAdmin(cookies);
    if (error) return error;

    const groupId = parseInt(params.id as string, 10);
    const group = mockGroups.find((g) => g.id === groupId);
    if (!group) {
      return HttpResponse.json(
        generateErrorResponse({ code: NOT_FOUND, message: 'Group not found' }),
        { status: 404 },
      );
    }

    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, parseInt(url.searchParams.get('pageSize') || '20', 10));
    const search = url.searchParams.get('search')?.toLowerCase() ?? '';
    const snapshotCreatedBefore =
      url.searchParams.get('snapshotCreatedBefore') || new Date().toISOString();

    let members = db.getAllUsers().filter((u) => u.groups.includes(group.groupKey));

    if (search) {
      members = members.filter(
        (u) =>
          u.firstName.toLowerCase().includes(search) ||
          u.lastName.toLowerCase().includes(search) ||
          u.email.toLowerCase().includes(search) ||
          u.studentId.toString().includes(search),
      );
    }

    const totalItems = members.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const data = members.slice((page - 1) * pageSize, page * pageSize).map((u) => ({
      studentId: u.studentId,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      assignedAt: u.createdDate ?? group.createdAt,
    }));

    return HttpResponse.json(
      generateSuccessResponse({
        data,
        pagination: {
          page,
          pageSize,
          totalItems,
          totalPages,
          hasNext: page < totalPages,
          hasPrevious: page > 1,
          snapshotCreatedBefore,
        },
      }),
    );
  }),

  // GET /audit-logs
  http.get(`${apiUrl}${endpoints.iam.auditLogs}`, ({ cookies, request }) => {
    const { error } = requireAdmin(cookies);
    if (error) return error;
    const url = new URL(request.url);
    const page = Math.max(0, parseInt(url.searchParams.get('page') || '1', 10) - 1);
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20', 10);
    const actorUserId = url.searchParams.get('actorUserId');
    const targetType = url.searchParams.get('targetType');
    const targetId = url.searchParams.get('targetId');
    const since = url.searchParams.get('since');

    let logs = [...mockAuditLogs];
    if (actorUserId) logs = logs.filter((l) => l.actorUserId === parseInt(actorUserId, 10));
    if (targetType) logs = logs.filter((l) => l.targetType === targetType);
    if (targetId) logs = logs.filter((l) => l.targetId === targetId);
    if (since) logs = logs.filter((l) => l.createdAt >= since);

    const totalElements = logs.length;
    const totalPages = Math.max(1, Math.ceil(totalElements / pageSize));
    const content = logs.slice(page * pageSize, (page + 1) * pageSize);

    return HttpResponse.json(
      generateSuccessResponse({
        content,
        totalElements,
        totalPages,
        number: page,
        size: pageSize,
        first: page === 0,
        last: page >= totalPages - 1,
        numberOfElements: content.length,
      }),
    );
  }),
];
