import type { ExperienceLevel } from '@/constants/experience-levels';
import type { Faculty } from '@/constants/faculties';

export type UserExperienceLevel = ExperienceLevel;
export type UserFaculty = Faculty;

export type UserRole = 'user' | 'admin';

export interface User {
  studentId: number;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  experienceLevel?: UserExperienceLevel;
  faculty?: UserFaculty;
}
