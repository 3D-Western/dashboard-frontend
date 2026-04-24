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

export function hasPermission(user: User, permission: string): boolean {
  return user.permissions.includes(permission);
}

export function hasAnyAdminPermission(user: User): boolean {
  return ADMIN_SECTION_PERMISSIONS.some((p) => hasPermission(user, p));
}
