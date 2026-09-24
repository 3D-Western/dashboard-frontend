import type { Faculty } from '@/constants/faculties';
import type { ExperienceLevel } from '@/constants/experience-levels';
import { ADMIN_SECTION_PERMISSIONS } from '@/constants/permissions';
import type { IamGroup } from '@/types/iam';

export type UserFaculty = Faculty;

export interface UserPermission {
  key: string;
  scopeKey: string;
}

export interface User {
  studentId: number;
  email: string;
  firstName: string;
  lastName: string;
  groups: IamGroup[];
  permissions: UserPermission[];
  faculty?: UserFaculty;
}

// Backend's AccountStatus enum (see UpdateUserStatusRequest / AdminUserProfile) — wire values
// are PascalCase, matching this codebase's convention for other status strings (PrintJobStatus).
export type AccountStatus = 'Active' | 'Locked' | 'Suspended' | 'Banned';

// Shape returned by the admin-only endpoints (GET/PATCH /api/v1/users, GET /api/v1/users/{id}).
// Deliberately separate from `User`: that type models `/users/me` (groups + permissions, no
// accountStatus), while this models the admin profile view (no groups/permissions, but
// accountStatus/createdAt/updatedAt).
export interface AdminUserProfile {
  studentId: number;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  updatedAt: string;
  experienceLevel: ExperienceLevel | null;
  faculty: UserFaculty;
  accountStatus: AccountStatus;
  accountStatusReason: string | null;
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
