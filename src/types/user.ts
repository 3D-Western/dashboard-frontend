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

export interface User {
  studentId: number;
  email: string;
  firstName: string;
  lastName: string;
  groups: Group[];
  permissions: string[];
  experienceLevel?: UserExperienceLevel;
  faculty?: UserFaculty;
}

export function hasPermission(user: User | null | undefined, permission: string): boolean {
  return user?.permissions?.includes(permission) ?? false;
}

export function hasAnyAdminPermission(user: User | null | undefined): boolean {
  return ADMIN_SECTION_PERMISSIONS.some((p) => hasPermission(user, p));
}
