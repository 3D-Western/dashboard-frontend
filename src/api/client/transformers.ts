import { User } from '@/types/user';
import { PaginatedResponse } from '@/types/common';
import { UserResponse, UserListResponseRaw } from '../types';

/**
 * Transforms a UserResponse from the backend into a User object for the frontend.
 * Handles case conversion for role and experienceLevel fields.
 *
 * Backend format: "Admin", "User", "Beginner", "Advanced", "No_experience"
 * Frontend format: "admin", "user", "beginner", "advanced", "no_experience"
 */
export function transformUserResponse(userResponse: UserResponse): User {
  return {
    studentId: userResponse.studentId,
    email: userResponse.email,
    firstName: userResponse.firstName,
    lastName: userResponse.lastName,
    role: userResponse.status.toLowerCase() as User['role'],
  };
}

/**
 * Transforms a paginated list of UserResponse objects into User objects.
 */
export function transformUserListResponse(
  response: UserListResponseRaw,
): PaginatedResponse<User> {
  return {
    ...response,
    data: response.data.map(transformUserResponse),
  };
}
