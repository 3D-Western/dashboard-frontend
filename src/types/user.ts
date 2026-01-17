import type { ExperienceLevel } from '@/constants/experience-levels';

export type UserExperienceLevel = ExperienceLevel;

export type UserRole = 'user' | 'admin';

export interface User {
  studentId: number;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  experienceLevel?: UserExperienceLevel;
}
