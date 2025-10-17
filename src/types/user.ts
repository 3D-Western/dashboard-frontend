export type UserExperienceLevel = 'beginner' | 'advanced' | 'no-experience';

export type UserStatus = 'member' | 'admin';

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  status: UserStatus;
  experienceLevel: UserExperienceLevel;
}
