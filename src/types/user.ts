import type { ExperienceLevel } from '@/constants/experience-levels';
import type { Faculty } from '@/constants/faculties';
import { ADMIN_SECTION_PERMISSIONS } from '@/constants/permissions';

export type UserExperienceLevel = ExperienceLevel;
export type UserFaculty = Faculty;

export interface Group {
  id: number;
  groupKey: string;
  name: string;
  description?: string | null;
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserPermission {
  key: string;
  scopeKey: string;
}

export interface User {
  studentId: number;
  email: string;
  firstName: string;
  lastName: string;
  groups: Group[];
  permissions: UserPermission[];
  experienceLevel?: UserExperienceLevel;
  faculty?: UserFaculty;
}

export function hasPermission(user: User | null | undefined, permission: string): boolean {
  return user?.permissions?.some((p) => p.key === permission) ?? false;
}

export function hasPermissionWithScope(
  user: User | null | undefined,
  permission: string,
  scopeKey: string,
): boolean {
  return user?.permissions?.some((p) => p.key === permission && p.scopeKey === scopeKey) ?? false;
}

export function hasAnyAdminPermission(user: User | null | undefined): boolean {
  return ADMIN_SECTION_PERMISSIONS.some((p) => hasPermission(user, p));
}
