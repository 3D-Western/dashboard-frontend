export type UserExperienceLevel = 'beginner' | 'advanced' | 'no-experience';

export type UserRole = 'user' | 'admin';

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  experienceLevel: UserExperienceLevel;
}
