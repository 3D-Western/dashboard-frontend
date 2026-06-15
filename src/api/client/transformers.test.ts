import { describe, it, expect } from 'vitest';
import {
  transformExperienceLevelToBackend,
  transformExperienceLevelFromBackend,
  transformFacultyToBackend,
  transformFacultyFromBackend,
  transformUserResponse,
  transformUserListResponse,
} from './transformers';
import { UserResponse, UserListResponseRaw } from '../types';
import { createMockUserResponse } from '@test/utils/mockFactories';

describe('transformers', () => {
  describe('transformExperienceLevelToBackend', () => {
    it('transforms "no_experience" to "NoExperience"', () => {
      expect(transformExperienceLevelToBackend('no_experience')).toBe('NoExperience');
    });

    it('transforms "beginner" to "Beginner"', () => {
      expect(transformExperienceLevelToBackend('beginner')).toBe('Beginner');
    });

    it('transforms "advanced" to "Advanced"', () => {
      expect(transformExperienceLevelToBackend('advanced')).toBe('Advanced');
    });
  });

  describe('transformExperienceLevelFromBackend', () => {
    it('transforms "NoExperience" to "no_experience"', () => {
      expect(transformExperienceLevelFromBackend('NoExperience')).toBe('no_experience');
    });

    it('transforms "Beginner" to "beginner"', () => {
      expect(transformExperienceLevelFromBackend('Beginner')).toBe('beginner');
    });

    it('transforms "Advanced" to "advanced"', () => {
      expect(transformExperienceLevelFromBackend('Advanced')).toBe('advanced');
    });

    it('returns "no_experience" as fallback for unknown values', () => {
      expect(transformExperienceLevelFromBackend('Unknown')).toBe('no_experience');
    });

    it('returns "no_experience" as fallback for empty string', () => {
      expect(transformExperienceLevelFromBackend('')).toBe('no_experience');
    });
  });

  describe('transformFacultyToBackend', () => {
    it('transforms "undeclared" to "Undeclared"', () => {
      expect(transformFacultyToBackend('undeclared')).toBe('Undeclared');
    });

    it('transforms "arts_and_humanities" to "ArtsAndHumanities"', () => {
      expect(transformFacultyToBackend('arts_and_humanities')).toBe('ArtsAndHumanities');
    });

    it('transforms "music" to "Music"', () => {
      expect(transformFacultyToBackend('music')).toBe('Music');
    });

    it('transforms "education" to "Education"', () => {
      expect(transformFacultyToBackend('education')).toBe('Education');
    });

    it('transforms "engineering" to "Engineering"', () => {
      expect(transformFacultyToBackend('engineering')).toBe('Engineering');
    });

    it('transforms "health_sciences" to "HealthSciences"', () => {
      expect(transformFacultyToBackend('health_sciences')).toBe('HealthSciences');
    });

    it('transforms "information_and_media_studies" to "InformationAndMediaStudies"', () => {
      expect(transformFacultyToBackend('information_and_media_studies')).toBe(
        'InformationAndMediaStudies',
      );
    });

    it('transforms "ivey_business_school" to "IveyBusinessSchool"', () => {
      expect(transformFacultyToBackend('ivey_business_school')).toBe('IveyBusinessSchool');
    });

    it('transforms "law" to "Law"', () => {
      expect(transformFacultyToBackend('law')).toBe('Law');
    });

    it('transforms "schulich_medicine_and_dentistry" to "SchulichMedicineAndDentistry"', () => {
      expect(transformFacultyToBackend('schulich_medicine_and_dentistry')).toBe(
        'SchulichMedicineAndDentistry',
      );
    });

    it('transforms "science" to "Science"', () => {
      expect(transformFacultyToBackend('science')).toBe('Science');
    });

    it('transforms "social_science" to "SocialScience"', () => {
      expect(transformFacultyToBackend('social_science')).toBe('SocialScience');
    });
  });

  describe('transformFacultyFromBackend', () => {
    it('transforms "Undeclared" to "undeclared"', () => {
      expect(transformFacultyFromBackend('Undeclared')).toBe('undeclared');
    });

    it('transforms "ArtsAndHumanities" to "arts_and_humanities"', () => {
      expect(transformFacultyFromBackend('ArtsAndHumanities')).toBe('arts_and_humanities');
    });

    it('transforms "Music" to "music"', () => {
      expect(transformFacultyFromBackend('Music')).toBe('music');
    });

    it('transforms "Education" to "education"', () => {
      expect(transformFacultyFromBackend('Education')).toBe('education');
    });

    it('transforms "Engineering" to "engineering"', () => {
      expect(transformFacultyFromBackend('Engineering')).toBe('engineering');
    });

    it('transforms "HealthSciences" to "health_sciences"', () => {
      expect(transformFacultyFromBackend('HealthSciences')).toBe('health_sciences');
    });

    it('transforms "InformationAndMediaStudies" to "information_and_media_studies"', () => {
      expect(transformFacultyFromBackend('InformationAndMediaStudies')).toBe(
        'information_and_media_studies',
      );
    });

    it('transforms "IveyBusinessSchool" to "ivey_business_school"', () => {
      expect(transformFacultyFromBackend('IveyBusinessSchool')).toBe('ivey_business_school');
    });

    it('transforms "Law" to "law"', () => {
      expect(transformFacultyFromBackend('Law')).toBe('law');
    });

    it('transforms "SchulichMedicineAndDentistry" to "schulich_medicine_and_dentistry"', () => {
      expect(transformFacultyFromBackend('SchulichMedicineAndDentistry')).toBe(
        'schulich_medicine_and_dentistry',
      );
    });

    it('transforms "Science" to "science"', () => {
      expect(transformFacultyFromBackend('Science')).toBe('science');
    });

    it('transforms "SocialScience" to "social_science"', () => {
      expect(transformFacultyFromBackend('SocialScience')).toBe('social_science');
    });

    it('returns "undeclared" as fallback for unknown values', () => {
      expect(transformFacultyFromBackend('Unknown')).toBe('undeclared');
    });

    it('returns "undeclared" as fallback for empty string', () => {
      expect(transformFacultyFromBackend('')).toBe('undeclared');
    });
  });

  describe('transformUserResponse', () => {
    it('transforms a complete user response with all fields', () => {
      const userResponse: UserResponse = {
        studentId: 251000001,
        email: 'test@uwo.ca',
        firstName: 'John',
        lastName: 'Doe',
        experienceLevel: 'Beginner',
        faculty: 'Engineering',
      };

      const result = transformUserResponse(userResponse);

      expect(result).toEqual({
        studentId: 251000001,
        email: 'test@uwo.ca',
        firstName: 'John',
        lastName: 'Doe',
        groups: [],
        permissions: [],
        experienceLevel: 'beginner',
        faculty: 'engineering',
      });
    });

    it('maps provided permissions into the user', () => {
      const userResponse: UserResponse = {
        studentId: 251000001,
        email: 'admin@uwo.ca',
        firstName: 'Admin',
        lastName: 'User',
      };

      const permissions = [
        { key: 'users:list', scopeKey: 'any' },
        { key: 'jobs:list', scopeKey: 'any' },
      ];
      const result = transformUserResponse(userResponse, [], permissions);

      expect(result.permissions).toEqual(permissions);
    });

    it('defaults to empty permissions when none provided', () => {
      const userResponse: UserResponse = {
        studentId: 251000001,
        email: 'test@uwo.ca',
        firstName: 'John',
        lastName: 'Doe',
      };

      const result = transformUserResponse(userResponse);

      expect(result.permissions).toEqual([]);
    });

    it('maps provided groups into the user', () => {
      const userResponse: UserResponse = {
        studentId: 251000001,
        email: 'admin@uwo.ca',
        firstName: 'Admin',
        lastName: 'User',
      };

      const groupResponse = {
        id: 2,
        groupKey: 'super_admins',
        name: 'Super Admins',
        description: null,
        isSystem: true,
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      const result = transformUserResponse(userResponse, [groupResponse]);

      expect(result.groups).toHaveLength(1);
      expect(result.groups[0].groupKey).toBe('super_admins');
    });

    it('defaults to empty groups when none provided', () => {
      const userResponse: UserResponse = {
        studentId: 251000001,
        email: 'test@uwo.ca',
        firstName: 'John',
        lastName: 'Doe',
      };

      const result = transformUserResponse(userResponse);

      expect(result.groups).toEqual([]);
    });

    it('handles missing experienceLevel field', () => {
      const userResponse: UserResponse = {
        studentId: 251000001,
        email: 'test@uwo.ca',
        firstName: 'John',
        lastName: 'Doe',
      };

      const result = transformUserResponse(userResponse);

      expect(result.experienceLevel).toBeUndefined();
    });

    it('handles missing faculty field', () => {
      const userResponse: UserResponse = {
        studentId: 251000001,
        email: 'test@uwo.ca',
        firstName: 'John',
        lastName: 'Doe',
      };

      const result = transformUserResponse(userResponse);

      expect(result.faculty).toBeUndefined();
    });

    it('transforms experienceLevel correctly', () => {
      const userResponse: UserResponse = {
        studentId: 251000001,
        email: 'test@uwo.ca',
        firstName: 'John',
        lastName: 'Doe',
        experienceLevel: 'Advanced',
      };

      const result = transformUserResponse(userResponse);

      expect(result.experienceLevel).toBe('advanced');
    });

    it('transforms faculty correctly', () => {
      const userResponse: UserResponse = {
        studentId: 251000001,
        email: 'test@uwo.ca',
        firstName: 'John',
        lastName: 'Doe',
        faculty: 'Science',
      };

      const result = transformUserResponse(userResponse);

      expect(result.faculty).toBe('science');
    });

    it('preserves all user properties', () => {
      const userResponse = createMockUserResponse({
        studentId: 251123456,
        email: 'specific@uwo.ca',
        firstName: 'Jane',
        lastName: 'Smith',
        experienceLevel: 'NoExperience',
        faculty: 'ArtsAndHumanities',
      });

      const result = transformUserResponse(userResponse);

      expect(result.studentId).toBe(251123456);
      expect(result.email).toBe('specific@uwo.ca');
      expect(result.firstName).toBe('Jane');
      expect(result.lastName).toBe('Smith');
      expect(result.groups).toEqual([]);
      expect(result.experienceLevel).toBe('no_experience');
      expect(result.faculty).toBe('arts_and_humanities');
    });

    it('falls back for unknown backend values', () => {
      const userResponse: UserResponse = {
        studentId: 251999999,
        email: 'unknown@uwo.ca',
        firstName: 'Mystery',
        lastName: 'User',
        experienceLevel: 'UnknownLevel',
        faculty: 'UnknownFaculty',
      };

      const result = transformUserResponse(userResponse);

      expect(result.experienceLevel).toBe('no_experience');
      expect(result.faculty).toBe('undeclared');
    });
  });

  describe('transformUserListResponse', () => {
    it('transforms an empty user list', () => {
      const response: UserListResponseRaw = {
        data: [],
        pagination: {
          page: 1,
          pageSize: 10,
          totalItems: 0,
          totalPages: 0,
          hasNext: false,
          hasPrevious: false,
          snapshotCreatedBefore: '2024-01-01T00:00:00Z',
        },
      };

      const result = transformUserListResponse(response);

      expect(result).toEqual({
        data: [],
        pagination: response.pagination,
      });
    });

    it('transforms a user list with one user', () => {
      const userResponse: UserResponse = {
        studentId: 251000001,
        email: 'test@uwo.ca',
        firstName: 'John',
        lastName: 'Doe',
        experienceLevel: 'Beginner',
        faculty: 'Engineering',
      };

      const response: UserListResponseRaw = {
        data: [userResponse],
        pagination: {
          page: 1,
          pageSize: 10,
          totalItems: 1,
          totalPages: 1,
          hasNext: false,
          hasPrevious: false,
          snapshotCreatedBefore: '2024-01-01T00:00:00Z',
        },
      };

      const result = transformUserListResponse(response);

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toEqual({
        studentId: 251000001,
        email: 'test@uwo.ca',
        firstName: 'John',
        lastName: 'Doe',
        groups: [],
        permissions: [],
        experienceLevel: 'beginner',
        faculty: 'engineering',
      });
      expect(result.pagination.totalItems).toBe(1);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.pageSize).toBe(10);
    });

    it('transforms a user list with multiple users', () => {
      const users: UserResponse[] = [
        {
          studentId: 251000001,
          email: 'user1@uwo.ca',
          firstName: 'User',
          lastName: 'One',
          experienceLevel: 'Beginner',
          faculty: 'Engineering',
        },
        {
          studentId: 251000002,
          email: 'admin@uwo.ca',
          firstName: 'Admin',
          lastName: 'User',
          experienceLevel: 'Advanced',
          faculty: 'Science',
        },
        {
          studentId: 251000003,
          email: 'user3@uwo.ca',
          firstName: 'User',
          lastName: 'Three',
        },
      ];

      const response: UserListResponseRaw = {
        data: users,
        pagination: {
          page: 1,
          pageSize: 10,
          totalItems: 3,
          totalPages: 1,
          hasNext: false,
          hasPrevious: false,
          snapshotCreatedBefore: '2024-01-01T00:00:00Z',
        },
      };

      const result = transformUserListResponse(response);

      expect(result.data).toHaveLength(3);
      expect(result.data[0].groups).toEqual([]);
      expect(result.data[1].experienceLevel).toBe('advanced');
      expect(result.data[2].experienceLevel).toBeUndefined();
      expect(result.pagination.totalItems).toBe(3);
    });

    it('preserves pagination metadata', () => {
      const response: UserListResponseRaw = {
        data: [],
        pagination: {
          page: 5,
          pageSize: 20,
          totalItems: 100,
          totalPages: 5,
          hasNext: false,
          hasPrevious: true,
          snapshotCreatedBefore: '2024-01-01T00:00:00Z',
        },
      };

      const result = transformUserListResponse(response);

      expect(result.pagination.page).toBe(5);
      expect(result.pagination.pageSize).toBe(20);
      expect(result.pagination.totalItems).toBe(100);
    });
  });
});
