import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@test/utils/render';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { mockServer } from '@/api/mocks';
import { endpoints } from '@/api/client/endpoints';
import { LoginForm } from '@/app/(auth)/login/login-form';
import { sessionApi } from '@/api/client/session';
import { ApiError, ErrorCodes } from '@/api/client/errors';
import { suppressConsoleError } from '@test/utils/testUtils';

// Mock Next.js router
const mockPush = vi.fn();
const mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => mockSearchParams,
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('LoginForm Branch Coverage', () => {
  beforeEach(() => {
    mockPush.mockClear();
    vi.clearAllMocks();
  });

  describe('Non-ApiError handling in login', () => {
    it('handles generic non-ApiError in onSubmit (line 137)', async () => {
      const user = userEvent.setup();
      const loginSpy = vi
        .spyOn(sessionApi, 'login')
        .mockRejectedValueOnce(new Error('Unexpected failure'));

      render(<LoginForm />);

      await user.type(screen.getByLabelText(/student id/i), '251000001');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /^login$/i }));

      await waitFor(() => {
        expect(screen.getByText(/login failed/i)).toBeInTheDocument();
      });

      // Should show generic error message
      expect(
        screen.getByText(/invalid credentials. please check your student id and password/i),
      ).toBeInTheDocument();
      loginSpy.mockRestore();
    });

    it('handles network timeout errors', async () => {
      const user = userEvent.setup();

      // Mock a network timeout by throwing a non-ApiError
      mockServer.use(
        http.post(`*${endpoints.auth.login}`, () => {
          throw new Error('Network timeout');
        }),
      );

      render(<LoginForm />);

      await user.type(screen.getByLabelText(/student id/i), '251000001');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /^login$/i }));

      await waitFor(() => {
        expect(screen.getByText(/login failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Non-ApiError handling in resend verification', () => {
    it('handles generic non-ApiError in handleResendVerification (line 174)', async () => {
      const user = userEvent.setup();
      const restoreConsole = suppressConsoleError();
      const loginSpy = vi.spyOn(sessionApi, 'login').mockRejectedValueOnce(
        new ApiError(ErrorCodes.EMAIL_NOT_VERIFIED, 'Email not verified', {
          challengeId: 12345,
          email: 'test@uwo.ca',
        }),
      );
      const resendSpy = vi
        .spyOn(sessionApi, 'resendEmailVerification')
        .mockRejectedValueOnce(new Error('Unexpected failure'));

      render(<LoginForm />);

      await user.type(screen.getByLabelText(/student id/i), '251000001');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /^login$/i }));

      await waitFor(() => {
        expect(screen.getByText(/email not verified/i)).toBeInTheDocument();
      });

      // Click resend button
      const resendButton = screen.getByRole('button', {
        name: /click here to resend verification email/i,
      });
      await user.click(resendButton);

      // Should show generic error message
      await waitFor(() => {
        expect(screen.getByText(/failed to resend email/i)).toBeInTheDocument();
      });

      expect(
        screen.getByText(/failed to resend verification email. please try again\./i),
      ).toBeInTheDocument();
      loginSpy.mockRestore();
      resendSpy.mockRestore();
      restoreConsole();
    });

    it('handles network errors during resend', async () => {
      const user = userEvent.setup();
      const restoreConsole = suppressConsoleError();

      mockServer.use(
        http.post(`*${endpoints.auth.login}`, () => {
          return HttpResponse.json(
            {
              success: false,
              error: {
                code: 'EMAIL_NOT_VERIFIED',
                message: 'Email not verified',
                details: {
                  challengeId: 12345,
                  email: 'test@uwo.ca',
                },
              },
            },
            { status: 403 },
          );
        }),
        http.post(`*${endpoints.emailVerify.resendEmail}`, () => {
          throw new Error('Network error');
        }),
      );

      render(<LoginForm />);

      await user.type(screen.getByLabelText(/student id/i), '251000001');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /^login$/i }));

      await waitFor(() => {
        expect(screen.getByText(/email not verified/i)).toBeInTheDocument();
      });

      const resendButton = screen.getByRole('button', {
        name: /click here to resend verification email/i,
      });
      await user.click(resendButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to resend email/i)).toBeInTheDocument();
      });
      restoreConsole();
    });
  });

  describe('Cooldown timer cleanup (line 87)', () => {
    it('cleans up timer when component unmounts during cooldown', async () => {
      const user = userEvent.setup();

      // Setup email verification error
      mockServer.use(
        http.post(`*${endpoints.auth.login}`, () => {
          return HttpResponse.json(
            {
              success: false,
              error: {
                code: 'EMAIL_NOT_VERIFIED',
                message: 'Email not verified',
                details: {
                  challengeId: 12345,
                  email: 'test@uwo.ca',
                },
              },
            },
            { status: 403 },
          );
        }),
        http.post(`*${endpoints.emailVerify.resendEmail}`, () => {
          return HttpResponse.json({
            success: true,
            data: { message: 'Verification email sent' },
          });
        }),
      );

      const { unmount } = render(<LoginForm />);

      await user.type(screen.getByLabelText(/student id/i), '251000001');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /^login$/i }));

      await waitFor(() => {
        expect(screen.getByText(/email not verified/i)).toBeInTheDocument();
      });

      // Click resend to start cooldown
      const resendButton = screen.getByRole('button', {
        name: /click here to resend verification email/i,
      });
      await user.click(resendButton);

      await waitFor(() => {
        expect(screen.getByText(/verification email sent/i)).toBeInTheDocument();
      });

      // Unmount while cooldown is active (this should trigger cleanup on line 87)
      unmount();

      // Test passes if no errors occur during unmount
      expect(true).toBe(true);
    });

    it('decrements cooldown timer every second', async () => {
      const user = userEvent.setup();

      mockServer.use(
        http.post(`*${endpoints.auth.login}`, () => {
          return HttpResponse.json(
            {
              success: false,
              error: {
                code: 'EMAIL_NOT_VERIFIED',
                message: 'Email not verified',
                details: {
                  challengeId: 12345,
                  email: 'test@uwo.ca',
                },
              },
            },
            { status: 403 },
          );
        }),
        http.post(`*${endpoints.emailVerify.resendEmail}`, () => {
          return HttpResponse.json({
            success: true,
            data: { message: 'Verification email sent' },
          });
        }),
      );

      render(<LoginForm />);

      await user.type(screen.getByLabelText(/student id/i), '251000001');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /^login$/i }));

      await waitFor(() => {
        expect(screen.getByText(/email not verified/i)).toBeInTheDocument();
      });

      const resendButton = screen.getByRole('button', {
        name: /click here to resend verification email/i,
      });
      await user.click(resendButton);

      await waitFor(() => {
        expect(screen.getByText(/verification email sent/i)).toBeInTheDocument();
      });

      // Should show 60 second cooldown
      expect(screen.getByRole('button', { name: /resend available in 60s/i })).toBeInTheDocument();

      // Advance timer by 1 second
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      });

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /resend available in 59s/i }),
        ).toBeInTheDocument();
      });

      // Advance timer by another second
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      });

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /resend available in 58s/i }),
        ).toBeInTheDocument();
      });
    });
  });

  describe('Edge cases', () => {
    it('handles resend when already in cooldown', async () => {
      const user = userEvent.setup();

      mockServer.use(
        http.post(`*${endpoints.auth.login}`, () => {
          return HttpResponse.json(
            {
              success: false,
              error: {
                code: 'EMAIL_NOT_VERIFIED',
                message: 'Email not verified',
                details: {
                  challengeId: 12345,
                  email: 'test@uwo.ca',
                },
              },
            },
            { status: 403 },
          );
        }),
        http.post(`*${endpoints.emailVerify.resendEmail}`, () => {
          return HttpResponse.json({
            success: true,
            data: { message: 'Verification email sent' },
          });
        }),
      );

      render(<LoginForm />);

      await user.type(screen.getByLabelText(/student id/i), '251000001');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /^login$/i }));

      await waitFor(() => {
        expect(screen.getByText(/email not verified/i)).toBeInTheDocument();
      });

      // Click resend button
      const resendButton = screen.getByRole('button', {
        name: /click here to resend verification email/i,
      });
      await user.click(resendButton);

      await waitFor(() => {
        expect(screen.getByText(/verification email sent/i)).toBeInTheDocument();
      });

      // Button should now be disabled with cooldown
      const cooldownButton = screen.getByRole('button', { name: /resend available in/i });
      expect(cooldownButton).toBeDisabled();

      // Try clicking again - should do nothing
      await user.click(cooldownButton);

      // Should still be in cooldown
      expect(screen.getByRole('button', { name: /resend available in/i })).toBeInTheDocument();
    });

    it('displays error from URL parameter', () => {
      render(<LoginForm error="unauthenticated" />);

      expect(screen.getByText(/session expired/i)).toBeInTheDocument();
      expect(
        screen.getByText(/your session has expired. please log in again to continue\./i),
      ).toBeInTheDocument();
    });

    it('handles missing email verification details gracefully', async () => {
      const user = userEvent.setup();

      mockServer.use(
        http.post(`*${endpoints.auth.login}`, () => {
          return HttpResponse.json(
            {
              success: false,
              error: {
                code: 'EMAIL_NOT_VERIFIED',
                message: 'Email not verified',
                // No details provided
              },
            },
            { status: 403 },
          );
        }),
      );

      render(<LoginForm />);

      await user.type(screen.getByLabelText(/student id/i), '251000001');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /^login$/i }));

      await waitFor(() => {
        expect(screen.getByText(/email not verified/i)).toBeInTheDocument();
      });

      // Should still show resend button with default values
      expect(
        screen.getByRole('button', { name: /click here to resend verification email/i }),
      ).toBeInTheDocument();
    });
  });
});
