import { User, UserExperienceLevel, UserFaculty } from '@/types/user';
import { PaginatedResponse } from '@/types/common';
import { UserResponse, UserListResponseRaw } from '../types';

/**
 * Transforms frontend experience level to backend format.
 *
 * Frontend: "no_experience", "beginner", "advanced"
 * Backend: "NoExperience", "Beginner", "Advanced"
 */
export function transformExperienceLevelToBackend(experienceLevel: UserExperienceLevel): string {
  const mapping: Record<UserExperienceLevel, string> = {
    no_experience: 'NoExperience',
    beginner: 'Beginner',
    advanced: 'Advanced',
  };

  return mapping[experienceLevel];
}

/**
 * Transforms backend experience level to frontend format.
 *
 * Backend: "NoExperience", "Beginner", "Advanced"
 * Frontend: "no_experience", "beginner", "advanced"
 */
export function transformExperienceLevelFromBackend(experienceLevel: string): UserExperienceLevel {
  const mapping: Record<string, UserExperienceLevel> = {
    NoExperience: 'no_experience',
    Beginner: 'beginner',
    Advanced: 'advanced',
  };

  return mapping[experienceLevel] || ('no_experience' as UserExperienceLevel);
}

/**
 * Transforms frontend faculty to backend format.
 *
 * Frontend: "undeclared", "arts_and_humanities", "engineering", etc.
 * Backend: "Undeclared", "ArtsAndHumanities", "Engineering", etc.
 */
export function transformFacultyToBackend(faculty: UserFaculty): string {
  const mapping: Record<UserFaculty, string> = {
    undeclared: 'Undeclared',
    arts_and_humanities: 'ArtsAndHumanities',
    music: 'Music',
    education: 'Education',
    engineering: 'Engineering',
    health_sciences: 'HealthSciences',
    information_and_media_studies: 'InformationAndMediaStudies',
    ivey_business_school: 'IveyBusinessSchool',
    law: 'Law',
    schulich_medicine_and_dentistry: 'SchulichMedicineAndDentistry',
    science: 'Science',
    social_science: 'SocialScience',
  };

  return mapping[faculty];
}

/**
 * Transforms backend faculty to frontend format.
 *
 * Backend: "Undeclared", "ArtsAndHumanities", "Engineering", etc.
 * Frontend: "undeclared", "arts_and_humanities", "engineering", etc.
 */
export function transformFacultyFromBackend(faculty: string): UserFaculty {
  const mapping: Record<string, UserFaculty> = {
    Undeclared: 'undeclared',
    ArtsAndHumanities: 'arts_and_humanities',
    Music: 'music',
    Education: 'education',
    Engineering: 'engineering',
    HealthSciences: 'health_sciences',
    InformationAndMediaStudies: 'information_and_media_studies',
    IveyBusinessSchool: 'ivey_business_school',
    Law: 'law',
    SchulichMedicineAndDentistry: 'schulich_medicine_and_dentistry',
    Science: 'science',
    SocialScience: 'social_science',
  };

  return mapping[faculty] || ('undeclared' as UserFaculty);
}

/**
 * Transforms a UserResponse from the backend into a User object for the frontend.
 * Handles case conversion for role, experienceLevel, and faculty fields.
 *
 * Backend format: "Admin", "User", "Beginner", "Advanced", "NoExperience", "Engineering", etc.
 * Frontend format: "admin", "user", "beginner", "advanced", "no_experience", "engineering", etc.
 */
export function transformUserResponse(userResponse: UserResponse): User {
  return {
    studentId: userResponse.studentId,
    email: userResponse.email,
    firstName: userResponse.firstName,
    lastName: userResponse.lastName,
    role: userResponse.status.toLowerCase() as User['role'],
    experienceLevel: userResponse.experienceLevel
      ? transformExperienceLevelFromBackend(userResponse.experienceLevel)
      : undefined,
    faculty: userResponse.faculty ? transformFacultyFromBackend(userResponse.faculty) : undefined,
  };
}

/**
 * Transforms a paginated list of UserResponse objects into User objects.
 */
export function transformUserListResponse(response: UserListResponseRaw): PaginatedResponse<User> {
  return {
    ...response,
    data: response.data.map(transformUserResponse),
  };
}
