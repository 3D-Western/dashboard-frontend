import {
  IamRole,
  IamGroup,
  IamPermission,
  IamRolePermission,
  IamScope,
  IamGroupMember,
  GroupMembersParams,
  CreateIamRoleRequest,
  UpdateIamRoleRequest,
  CreateIamGroupRequest,
  UpdateIamGroupRequest,
  ReplaceRolePermissionsRequest,
} from '@/types/iam';
import { PaginatedResponse } from '@/types/common';
import { IamAuditLogPageResponse } from '../types';
import { apiRequest } from './base';
import { endpoints } from './endpoints';
import { getBaseUrl } from './utils';

export interface IamAuditLogParams {
  actorUserId?: number;
  targetType?: string;
  targetId?: string;
  since?: string;
  page?: number;
  pageSize?: number;
}

export const iamApi = {
  // ── Permissions ──────────────────────────────────────────────────────────

  listPermissions: async (options?: RequestInit) => {
    return apiRequest<IamPermission[]>(`${getBaseUrl()}${endpoints.iam.permissions}`, {
      method: 'GET',
      credentials: 'include',
      ...options,
    });
  },

  listScopes: async (options?: RequestInit) => {
    return apiRequest<IamScope[]>(`${getBaseUrl()}${endpoints.iam.scopes}`, {
      method: 'GET',
      credentials: 'include',
      ...options,
    });
  },

  // ── Roles ─────────────────────────────────────────────────────────────────

  listRoles: async (activeOnly = true, options?: RequestInit) => {
    const url = `${getBaseUrl()}${endpoints.iam.roles.list}?activeOnly=${activeOnly}`;
    return apiRequest<IamRole[]>(url, {
      method: 'GET',
      credentials: 'include',
      ...options,
    });
  },

  getRoleById: async (id: number, options?: RequestInit) => {
    return apiRequest<IamRole>(`${getBaseUrl()}${endpoints.iam.roles.byId(id)}`, {
      method: 'GET',
      credentials: 'include',
      ...options,
    });
  },

  createRole: async (data: CreateIamRoleRequest, options?: RequestInit) => {
    return apiRequest<IamRole>(`${getBaseUrl()}${endpoints.iam.roles.create}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      ...options,
    });
  },

  updateRole: async (id: number, data: UpdateIamRoleRequest, options?: RequestInit) => {
    return apiRequest<IamRole>(`${getBaseUrl()}${endpoints.iam.roles.update(id)}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      ...options,
    });
  },

  deactivateRole: async (id: number, options?: RequestInit) => {
    return apiRequest<null>(`${getBaseUrl()}${endpoints.iam.roles.deactivate(id)}`, {
      method: 'DELETE',
      credentials: 'include',
      ...options,
    });
  },

  // ── Role Permissions ──────────────────────────────────────────────────────

  listRolePermissions: async (roleId: number, options?: RequestInit) => {
    return apiRequest<IamRolePermission[]>(
      `${getBaseUrl()}${endpoints.iam.roles.permissions(roleId)}`,
      { method: 'GET', credentials: 'include', ...options },
    );
  },

  replaceRolePermissions: async (
    roleId: number,
    data: ReplaceRolePermissionsRequest,
    options?: RequestInit,
  ) => {
    return apiRequest<IamRolePermission[]>(
      `${getBaseUrl()}${endpoints.iam.roles.permissions(roleId)}`,
      {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        ...options,
      },
    );
  },

  // ── Groups ────────────────────────────────────────────────────────────────

  listGroups: async (activeOnly = true, options?: RequestInit) => {
    const url = `${getBaseUrl()}${endpoints.iam.groups.list}?activeOnly=${activeOnly}`;
    return apiRequest<IamGroup[]>(url, {
      method: 'GET',
      credentials: 'include',
      ...options,
    });
  },

  getGroupById: async (id: number, options?: RequestInit) => {
    return apiRequest<IamGroup>(`${getBaseUrl()}${endpoints.iam.groups.byId(id)}`, {
      method: 'GET',
      credentials: 'include',
      ...options,
    });
  },

  createGroup: async (data: CreateIamGroupRequest, options?: RequestInit) => {
    return apiRequest<IamGroup>(`${getBaseUrl()}${endpoints.iam.groups.create}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      ...options,
    });
  },

  updateGroup: async (id: number, data: UpdateIamGroupRequest, options?: RequestInit) => {
    return apiRequest<IamGroup>(`${getBaseUrl()}${endpoints.iam.groups.update(id)}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      ...options,
    });
  },

  deactivateGroup: async (id: number, options?: RequestInit) => {
    return apiRequest<null>(`${getBaseUrl()}${endpoints.iam.groups.deactivate(id)}`, {
      method: 'DELETE',
      credentials: 'include',
      ...options,
    });
  },

  // ── Group Members ─────────────────────────────────────────────────────────

  listGroupUsers: async (groupId: number, params?: GroupMembersParams, options?: RequestInit) => {
    const searchParams = new URLSearchParams();
    if (params?.page !== undefined) searchParams.append('page', params.page.toString());
    if (params?.pageSize !== undefined) searchParams.append('pageSize', params.pageSize.toString());
    if (params?.search) searchParams.append('search', params.search);
    if (params?.snapshotCreatedBefore) {
      searchParams.append('snapshotCreatedBefore', params.snapshotCreatedBefore);
    }
    const queryString = searchParams.toString();
    const url = `${getBaseUrl()}${endpoints.iam.groups.users(groupId)}${queryString ? `?${queryString}` : ''}`;
    return apiRequest<PaginatedResponse<IamGroupMember>>(url, {
      method: 'GET',
      credentials: 'include',
      ...options,
    });
  },

  // ── Group Roles ───────────────────────────────────────────────────────────

  listGroupRoles: async (groupId: number, options?: RequestInit) => {
    return apiRequest<IamRole[]>(`${getBaseUrl()}${endpoints.iam.groups.roles(groupId)}`, {
      method: 'GET',
      credentials: 'include',
      ...options,
    });
  },

  assignGroupRole: async (groupId: number, roleId: number, options?: RequestInit) => {
    return apiRequest<IamRole>(`${getBaseUrl()}${endpoints.iam.groups.roles(groupId)}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roleId }),
      ...options,
    });
  },

  revokeGroupRole: async (groupId: number, roleId: number, options?: RequestInit) => {
    return apiRequest<null>(`${getBaseUrl()}${endpoints.iam.groups.revokeRole(groupId, roleId)}`, {
      method: 'DELETE',
      credentials: 'include',
      ...options,
    });
  },

  // ── User Groups ───────────────────────────────────────────────────────────

  listUserGroups: async (userId: number, options?: RequestInit) => {
    return apiRequest<IamGroup[]>(`${getBaseUrl()}${endpoints.iam.users.groups(userId)}`, {
      method: 'GET',
      credentials: 'include',
      ...options,
    });
  },

  assignUserGroup: async (userId: number, groupId: number, options?: RequestInit) => {
    return apiRequest<IamGroup>(`${getBaseUrl()}${endpoints.iam.users.groups(userId)}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId }),
      ...options,
    });
  },

  revokeUserGroup: async (userId: number, groupId: number, options?: RequestInit) => {
    return apiRequest<null>(`${getBaseUrl()}${endpoints.iam.users.revokeGroup(userId, groupId)}`, {
      method: 'DELETE',
      credentials: 'include',
      ...options,
    });
  },

  // ── User Roles (direct) ───────────────────────────────────────────────────

  listUserRoles: async (userId: number, options?: RequestInit) => {
    return apiRequest<IamRole[]>(`${getBaseUrl()}${endpoints.iam.users.roles(userId)}`, {
      method: 'GET',
      credentials: 'include',
      ...options,
    });
  },

  assignUserRole: async (userId: number, roleId: number, options?: RequestInit) => {
    return apiRequest<IamRole>(`${getBaseUrl()}${endpoints.iam.users.roles(userId)}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roleId }),
      ...options,
    });
  },

  revokeUserRole: async (userId: number, roleId: number, options?: RequestInit) => {
    return apiRequest<null>(`${getBaseUrl()}${endpoints.iam.users.revokeRole(userId, roleId)}`, {
      method: 'DELETE',
      credentials: 'include',
      ...options,
    });
  },

  // ── Audit Logs ────────────────────────────────────────────────────────────

  listAuditLogs: async (params?: IamAuditLogParams, options?: RequestInit) => {
    const searchParams = new URLSearchParams();
    if (params?.actorUserId !== undefined)
      searchParams.append('actorUserId', params.actorUserId.toString());
    if (params?.targetType !== undefined) searchParams.append('targetType', params.targetType);
    if (params?.targetId !== undefined) searchParams.append('targetId', params.targetId);
    if (params?.since !== undefined) searchParams.append('since', params.since);
    if (params?.page !== undefined) searchParams.append('page', params.page.toString());
    if (params?.pageSize !== undefined) searchParams.append('pageSize', params.pageSize.toString());

    const queryString = searchParams.toString();
    const url = `${getBaseUrl()}${endpoints.iam.auditLogs}${queryString ? `?${queryString}` : ''}`;

    return apiRequest<IamAuditLogPageResponse>(url, {
      method: 'GET',
      credentials: 'include',
      ...options,
    });
  },
};
