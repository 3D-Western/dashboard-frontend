import { http, HttpResponse } from 'msw';
import { mockServer } from '@/api/mocks';
import { endpoints } from '@/api/client/endpoints';
import { User } from '@/types/user';
import { createMockUser, createMockUserResponse, createMockGroupResponses } from './mockFactories';
import { ErrorCodes } from '@/api/client/errors';

/**
 * Mock an authenticated session
 * This makes sessionApi.current() return the provided user
 *
 * @example
 * ```ts
 * test('shows user name when authenticated', () => {
 *   const user = mockAuthenticatedSession();
 *   render(<DashboardHeader user={user} />);
 *   expect(screen.getByText(user.firstName)).toBeInTheDocument();
 * });
 * ```
 */
export function mockAuthenticatedSession(user: User = createMockUser()): User {
  // Convert frontend User format to backend UserResponse format for the mock
  const userResponse = createMockUserResponse({
    studentId: user.studentId,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
  });

  const groupResponses = createMockGroupResponses(user.groups);

  mockServer.use(
    http.get(`*${endpoints.users.me}`, () => {
      return HttpResponse.json({
        success: true,
        data: {
          user: userResponse,
          groups: groupResponses,
          permissions: user.permissions,
          activeJobCount: 0,
        },
      });
    }),
  );
  return user;
}

/**
 * Mock an unauthenticated session (no valid session)
 * This makes sessionApi.current() return UNAUTHORIZED error
 *
 * @example
 * ```ts
 * test('redirects to login when not authenticated', async () => {
 *   mockUnauthenticatedSession();
 *   const user = await validateSession();
 *   expect(user).toBeNull();
 * });
 * ```
 */
export function mockUnauthenticatedSession(): void {
  mockServer.use(
    http.get(`*${endpoints.users.me}`, () => {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: ErrorCodes.UNAUTHORIZED,
            message: 'No valid session',
          },
        },
        { status: 401 },
      );
    }),
  );
}

/**
 * Mock a successful login response
 * This makes sessionApi.login() succeed and return a session token (bypassing MFA)
 *
 * @example
 * ```ts
 * test('logs in successfully', async () => {
 *   const user = mockSuccessfulLogin();
 *   await sessionApi.login(251000001, 'password');
 *   // Login succeeded
 * });
 * ```
 */
export function mockSuccessfulLogin(user: User = createMockUser()): User {
  mockServer.use(
    http.post(`*${endpoints.auth.login}`, () => {
      return HttpResponse.json(
        {
          success: true,
          data: {
            sessionToken: 'mock-session-token',
            requiresMfa: false, // Bypass MFA for testing
          },
        },
        {
          headers: {
            'Set-Cookie': 'sessionToken=mock-session-token; Path=/; SameSite=Strict',
          },
        },
      );
    }),
  );

  // Also mock the current session to return the user after login
  mockAuthenticatedSession(user);

  return user;
}

/**
 * Mock a failed login response
 * This makes sessionApi.login() throw INVALID_CREDENTIALS error
 *
 * @example
 * ```ts
 * test('shows error on invalid credentials', async () => {
 *   mockFailedLogin();
 *   await expect(
 *     sessionApi.login(251000001, 'wrongpassword')
 *   ).rejects.toThrow();
 * });
 * ```
 */
export function mockFailedLogin(): void {
  mockServer.use(
    http.post(`*${endpoints.auth.login}`, () => {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: ErrorCodes.INVALID_CREDENTIALS,
            message: 'Invalid student ID or password',
          },
        },
        { status: 401 },
      );
    }),
  );
}

/**
 * Mock a successful logout
 * This makes sessionApi.logout() succeed
 *
 * @example
 * ```ts
 * test('logs out successfully', async () => {
 *   mockSuccessfulLogout();
 *   await sessionApi.logout();
 *   // Logout succeeded
 * });
 * ```
 */
export function mockSuccessfulLogout(): void {
  mockServer.use(
    http.post(`*${endpoints.auth.logout}`, () => {
      return HttpResponse.json(
        {
          success: true,
          data: {},
        },
        { status: 204 },
      );
    }),
  );
}
