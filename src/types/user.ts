import type { ExperienceLevel } from '@/constants/experience-levels';
import type { Faculty } from '@/constants/faculties';

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

export function isAdmin(user: User): boolean {
  return user.groups.some((g) => g.groupKey === 'super_admins');
}

export function hasPermission(user: User, permission: string): boolean {
  return user.permissions.includes(permission);
}
