import { http, HttpResponse } from 'msw';
import { endpoints } from '../client/endpoints';
import db from './database/db';
import {
  createInvalidSessionResponse,
  generateSuccessResponse,
  generateErrorResponse,
} from './utils';
import { ErrorCodes } from '../client/errors';

const apiUrl = process.env.API_URL;

export const userHandlers = [
  // GET /users - List all users with pagination
  http.get(`${apiUrl}${endpoints.users.list}`, ({ cookies, request }) => {
    const sessionId = cookies['sessionToken'] || '';
    const user = db.validateSession(sessionId);
    if (!user) {
      return createInvalidSessionResponse();
    }

    // Only admins can list all users
    if (user.role !== 'admin') {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Admin role required to access this resource',
          },
        },
        { status: 403 },
      );
    }

    // Parse query parameters
    const url = new URL(request.url);
    const searchTerm = url.searchParams.get('search');
    const statusFilter = url.searchParams.get('status');
    const trainingLevelFilter = url.searchParams.get('trainingLevel');
    const experienceLevelFilter = url.searchParams.get('experienceLevel');
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10', 10);
    const snapshotCreatedBefore =
      url.searchParams.get('snapshotCreatedBefore') || new Date().toISOString();

    // Get all users
    let users = db.getAllUsers();

    // Apply snapshot filter (only users created before the snapshot)
    users = users.filter((u) => {
      const createdDate = u.createdDate || new Date(0).toISOString();
      return createdDate <= snapshotCreatedBefore;
    });

    // Apply search filter (search in firstName, lastName, email, studentId)
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      users = users.filter(
        (u) =>
          u.firstName.toLowerCase().includes(lowerSearch) ||
          u.lastName.toLowerCase().includes(lowerSearch) ||
          u.email.toLowerCase().includes(lowerSearch) ||
          u.studentId.toString().includes(searchTerm),
      );
    }

    // Apply status filter
    if (statusFilter) {
      users = users.filter((u) => u.role === statusFilter);
    }

    // Apply training level filter
    if (trainingLevelFilter) {
      users = users.filter((u) => u.trainingLevel === trainingLevelFilter);
    }

    // Apply experience level filter
    if (experienceLevelFilter) {
      users = users.filter((u) => u.experienceLevel === experienceLevelFilter);
    }

    // Map to API response format (with capitalized values to match backend)
    const userList = users.map((u) => ({
      studentId: u.studentId,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      createdDate: u.createdDate || new Date().toISOString(),
      status: u.role.charAt(0).toUpperCase() + u.role.slice(1), // "admin" -> "Admin", "user" -> "User"
      trainingLevel: u.trainingLevel,
      experienceLevel:
        u.experienceLevel
          ?.split('_')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join('_') || 'Beginner', // "no_experience" -> "No_experience"
    }));

    // Calculate pagination
    const totalItems = userList.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedUsers = userList.slice(startIndex, endIndex);

    return HttpResponse.json(
      generateSuccessResponse({
        data: paginatedUsers,
        pagination: {
          page,
          pageSize,
          totalItems,
          totalPages,
          hasNext: page < totalPages,
          hasPrevious: page > 1,
          snapshotCreatedBefore,
        },
      }),
    );
  }),

  // GET /users/:userId - Get user by ID
  http.get(`${apiUrl}/api/v1/users/:userId`, ({ cookies, params }) => {
    const sessionId = cookies['sessionToken'] || '';
    const user = db.validateSession(sessionId);
    if (!user) {
      return createInvalidSessionResponse();
    }

    // Only admins can view other users
    if (user.role !== 'admin') {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Admin role required to access this resource',
          },
        },
        { status: 403 },
      );
    }

    const { userId } = params;
    const targetUser = db.getUserById(parseInt(userId as string, 10));

    if (!targetUser) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: `User with ID ${userId} not found`,
          },
        },
        { status: 404 },
      );
    }

    return HttpResponse.json(
      generateSuccessResponse({
        studentId: targetUser.studentId,
        email: targetUser.email,
        firstName: targetUser.firstName,
        lastName: targetUser.lastName,
        createdDate: targetUser.createdDate || new Date().toISOString(),
        status: targetUser.role.charAt(0).toUpperCase() + targetUser.role.slice(1), // "admin" -> "Admin"
        trainingLevel: targetUser.trainingLevel,
        experienceLevel:
          targetUser.experienceLevel
            ?.split('_')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join('_') || 'Beginner', // "no_experience" -> "No_experience"
      }),
    );
  }),

  http.get(`${apiUrl}${endpoints.users.jobs}`, ({ cookies, request }) => {
    const sessionId = cookies['sessionToken'] || '';
    const user = db.validateSession(sessionId);
    if (!user) {
      return createInvalidSessionResponse();
    }

    // Parse query parameters
    const url = new URL(request.url);
    const statusFilter = url.searchParams.get('status');
    const searchTerm = url.searchParams.get('search');
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10', 10);
    const snapshotCreatedBefore =
      url.searchParams.get('snapshotCreatedBefore') || new Date().toISOString();

    // Get print jobs using the shared function with filters
    const printJobs = db.getPrintJobs({
      userId: user.studentId,
      status: statusFilter || undefined,
      search: searchTerm || undefined,
      snapshotCreatedBefore,
    });

    // Calculate pagination
    const totalItems = printJobs.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedJobs = printJobs.slice(startIndex, endIndex);

    return HttpResponse.json(
      generateSuccessResponse({
        data: paginatedJobs,
        pagination: {
          page,
          pageSize,
          totalItems,
          totalPages,
          hasNext: page < totalPages,
          hasPrevious: page > 1,
          snapshotCreatedBefore,
        },
      }),
    );
  }),

  // POST /users/me/password - Change password
  http.post(`${apiUrl}${endpoints.users.changePassword}`, async ({ cookies, request }) => {
    const sessionId = cookies['sessionToken'] || '';
    const user = db.validateSession(sessionId);
    if (!user) {
      return createInvalidSessionResponse();
    }

    const { currentPassword, newPassword, confirmNewPassword, invalidateAllSessions } =
      (await request.json()) as {
        currentPassword: string;
        newPassword: string;
        confirmNewPassword: string;
        invalidateAllSessions?: boolean;
      };

    // Validate current password
    if (user.password !== currentPassword) {
      return HttpResponse.json(
        generateErrorResponse({
          code: ErrorCodes.INVALID_CREDENTIALS,
          message: 'Current password is incorrect',
        }),
        { status: 401 },
      );
    }

    // Validate password length (backend requires 10+ characters)
    if (newPassword.length < 10) {
      return HttpResponse.json(
        generateErrorResponse({
          code: ErrorCodes.VALIDATION_FAILED,
          message: 'Password must be at least 10 characters',
        }),
        { status: 400 },
      );
    }

    // Validate passwords match
    if (newPassword !== confirmNewPassword) {
      return HttpResponse.json(
        generateErrorResponse({
          code: ErrorCodes.VALIDATION_FAILED,
          message: 'Passwords do not match',
        }),
        { status: 400 },
      );
    }

    // Prevent password reuse
    if (currentPassword === newPassword) {
      return HttpResponse.json(
        generateErrorResponse({
          code: ErrorCodes.VALIDATION_FAILED,
          message: 'New password must be different from current password',
        }),
        { status: 400 },
      );
    }

    // Update password (in production, this would be hashed)
    user.password = newPassword;

    console.log(
      `[MSW Mock] Password changed successfully for student ${user.studentId}${invalidateAllSessions ? ' (signing out all sessions)' : ''}`,
    );

    return HttpResponse.json(
      generateSuccessResponse({
        message: 'Password updated successfully',
      }),
      { status: 200 },
    );
  }),
];
