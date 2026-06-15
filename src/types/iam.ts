import type { PermissionKey } from '@/constants/permissions';

export interface IamRole {
  id: number;
  roleKey: string;
  name: string;
  description?: string | null;
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IamGroup {
  id: number;
  groupKey: string;
  name: string;
  description?: string | null;
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IamPermission {
  key: PermissionKey;
  description: string;
  isDangerous: boolean;
  isActive: boolean;
}

export interface IamRolePermission extends IamPermission {
  scopeKey: string;
}

export interface IamScope {
  scopeKey: string;
  description: string;
}

export interface IamAuditLog {
  id: number;
  actorUserId?: number | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
}

export interface CreateIamRoleRequest {
  roleKey: string;
  name: string;
  description?: string;
}

export interface UpdateIamRoleRequest {
  name?: string;
  description?: string;
  isActive?: boolean;
}

export interface CreateIamGroupRequest {
  groupKey: string;
  name: string;
  description?: string;
}

export interface UpdateIamGroupRequest {
  name?: string;
  description?: string;
  isActive?: boolean;
}

export interface ReplaceRolePermissionsRequest {
  permissions: Array<{ permissionKey: PermissionKey; scopeKey: string }>;
}

export interface IamGroupMember {
  studentId: number;
  email: string;
  firstName: string;
  lastName: string;
  assignedAt: string;
}

export interface GroupMembersParams {
  page?: number;
  pageSize?: number;
  search?: string;
  snapshotCreatedBefore?: string;
}
