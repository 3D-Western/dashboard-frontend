import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@test/utils/render';
import { http, HttpResponse } from 'msw';
import { mockServer } from '@/api/mocks';
import { endpoints } from '@/api/client/endpoints';
import { VerifyEmailContent } from '@/app/(auth)/verify-email/verify-email-content';

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

describe('VerifyEmailContent Integration', () => {
  beforeEach(() => {
    mockPush.mockClear();
    vi.clearAllMocks();
    mockSearchParams.delete('token');
  });

  describe('Loading State', () => {
    it('displays loading indicator while verifying email', async () => {
      mockSearchParams.set('token', 'valid-token-123');

      mockServer.use(
        http.post(`*${endpoints.emailVerify.verifyEmail}`, async () => {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          return HttpResponse.json({
            success: true,
            data: { message: 'Email verified successfully' },
          });
        }),
      );

      render(<VerifyEmailContent />);

      expect(screen.getByText(/verifying your email/i)).toBeInTheDocument();
      expect(
        screen.getByText(/please wait while we verify your email address/i),
      ).toBeInTheDocument();
    });
  });

  describe('Successful Verification', () => {
    it('displays success message after successful verification', async () => {
      mockSearchParams.set('token', 'valid-token-123');

      mockServer.use(
        http.post(`*${endpoints.emailVerify.verifyEmail}`, () => {
          return HttpResponse.json({
            success: true,
            data: { message: 'Email verified successfully' },
          });
        }),
      );

      render(<VerifyEmailContent />);

      await waitFor(
        () => {
          expect(screen.getByText(/email verified/i)).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      expect(screen.getByText(/your email has been successfully verified/i)).toBeInTheDocument();
    });

    it('displays countdown timer after successful verification', async () => {
      mockSearchParams.set('token', 'valid-token-123');

      mockServer.use(
        http.post(`*${endpoints.emailVerify.verifyEmail}`, () => {
          return HttpResponse.json({
            success: true,
            data: { message: 'Email verified successfully' },
          });
        }),
      );

      render(<VerifyEmailContent />);

      await waitFor(
        () => {
          expect(screen.getByText(/email verified/i)).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      // Should display countdown text (checking for any countdown value)
      expect(screen.getByText(/redirecting to login in \d+ second/i)).toBeInTheDocument();
    });

    it('countdown decrements over time', async () => {
      mockSearchParams.set('token', 'valid-token-123');

      mockServer.use(
        http.post(`*${endpoints.emailVerify.verifyEmail}`, () => {
          return HttpResponse.json({
            success: true,
            data: { message: 'Email verified successfully' },
          });
        }),
      );

      render(<VerifyEmailContent />);

      // Wait for success message
      await waitFor(
        () => {
          expect(screen.getByText(/email verified/i)).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      // Verify countdown starts at 5
      expect(screen.getByText(/5 seconds/i)).toBeInTheDocument();

      // Wait for countdown to decrement
      await waitFor(
        () => {
          expect(screen.getByText(/4 seconds/i)).toBeInTheDocument();
        },
        { timeout: 2000 },
      );
    }, 15000);

    it('redirects to login page after countdown completes', async () => {
      mockSearchParams.set('token', 'valid-token-123');

      mockServer.use(
        http.post(`*${endpoints.emailVerify.verifyEmail}`, () => {
          return HttpResponse.json({
            success: true,
            data: { message: 'Email verified successfully' },
          });
        }),
      );

      render(<VerifyEmailContent />);

      // Wait for success message
      await waitFor(
        () => {
          expect(screen.getByText(/email verified/i)).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      // Wait for redirect (should happen after 5 seconds)
      await waitFor(
        () => {
          expect(mockPush).toHaveBeenCalledWith('/login');
        },
        { timeout: 7000 },
      );
    }, 10000);

    it('displays manual login button', async () => {
      mockSearchParams.set('token', 'valid-token-123');

      mockServer.use(
        http.post(`*${endpoints.emailVerify.verifyEmail}`, () => {
          return HttpResponse.json({
            success: true,
            data: { message: 'Email verified successfully' },
          });
        }),
      );

      render(<VerifyEmailContent />);

      await waitFor(
        () => {
          expect(screen.getByText(/email verified/i)).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      const loginButton = screen.getByRole('link', { name: /continue to login/i });
      expect(loginButton).toBeInTheDocument();
      expect(loginButton).toHaveAttribute('href', '/login');
    });
  });

  describe('Error Handling', () => {
    it('displays error message with StatusAlert on verification failure', async () => {
      mockSearchParams.set('token', 'invalid-token');

      mockServer.use(
        http.post(`*${endpoints.emailVerify.verifyEmail}`, () => {
          return HttpResponse.json(
            {
              success: false,
              error: {
                code: 'INVALID_TOKEN',
                message: 'The verification token is invalid or has expired',
              },
            },
            { status: 400 },
          );
        }),
      );

      render(<VerifyEmailContent />);

      await waitFor(
        () => {
          expect(screen.getByText(/verification failed/i)).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      expect(screen.getByText(/verification error/i)).toBeInTheDocument();
      expect(
        screen.getByText(/the verification token is invalid or has expired/i),
      ).toBeInTheDocument();
    });

    it('displays return to login button on error', async () => {
      mockSearchParams.set('token', 'invalid-token');

      mockServer.use(
        http.post(`*${endpoints.emailVerify.verifyEmail}`, () => {
          return HttpResponse.json(
            {
              success: false,
              error: {
                code: 'INVALID_TOKEN',
                message: 'Token expired',
              },
            },
            { status: 400 },
          );
        }),
      );

      render(<VerifyEmailContent />);

      await waitFor(
        () => {
          expect(screen.getByText(/verification failed/i)).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      const loginButton = screen.getByRole('link', { name: /return to login/i });
      expect(loginButton).toBeInTheDocument();
      expect(loginButton).toHaveAttribute('href', '/login');
    });

    it('handles network errors gracefully', async () => {
      mockSearchParams.set('token', 'valid-token');

      mockServer.use(
        http.post(`*${endpoints.emailVerify.verifyEmail}`, () => {
          return HttpResponse.error();
        }),
      );

      render(<VerifyEmailContent />);

      await waitFor(
        () => {
          expect(screen.getByText(/verification failed/i)).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      expect(screen.getByText(/network request failed|failed to fetch/i)).toBeInTheDocument();
    });
  });

  describe('Invalid Token', () => {
    it('displays invalid token message when token is missing', async () => {
      // No token in search params
      render(<VerifyEmailContent />);

      await waitFor(
        () => {
          expect(screen.getByText(/invalid link/i)).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      expect(screen.getByText(/invalid token/i)).toBeInTheDocument();
      expect(screen.getByText(/this verification link is invalid/i)).toBeInTheDocument();
    });

    it('does not call API when token is missing', async () => {
      const apiSpy = vi.fn();

      mockServer.use(
        http.post(`*${endpoints.emailVerify.verifyEmail}`, () => {
          apiSpy();
          return HttpResponse.json({
            success: true,
            data: { message: 'Email verified' },
          });
        }),
      );

      render(<VerifyEmailContent />);

      await waitFor(
        () => {
          expect(screen.getByText(/invalid link/i)).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      expect(apiSpy).not.toHaveBeenCalled();
    });

    it('displays return to login button on invalid token', async () => {
      render(<VerifyEmailContent />);

      await waitFor(
        () => {
          expect(screen.getByText(/invalid link/i)).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      const loginButton = screen.getByRole('link', { name: /return to login/i });
      expect(loginButton).toBeInTheDocument();
      expect(loginButton).toHaveAttribute('href', '/login');
    });
  });

  describe('API Integration', () => {
    it('sends correct token to verifyEmail API', async () => {
      const testToken = 'test-token-abc123';
      mockSearchParams.set('token', testToken);

      let receivedToken: string | undefined;

      mockServer.use(
        http.post(`*${endpoints.emailVerify.verifyEmail}`, async ({ request }) => {
          const body = (await request.json()) as { token?: string };
          receivedToken = body.token;
          return HttpResponse.json({
            success: true,
            data: { message: 'Email verified' },
          });
        }),
      );

      render(<VerifyEmailContent />);

      await waitFor(
        () => {
          expect(screen.getByText(/email verified/i)).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      expect(receivedToken).toBe(testToken);
    });

    it('handles expired token error specifically', async () => {
      mockSearchParams.set('token', 'expired-token');

      mockServer.use(
        http.post(`*${endpoints.emailVerify.verifyEmail}`, () => {
          return HttpResponse.json(
            {
              success: false,
              error: {
                code: 'TOKEN_EXPIRED',
                message: 'The verification link has expired. Please request a new one.',
              },
            },
            { status: 400 },
          );
        }),
      );

      render(<VerifyEmailContent />);

      await waitFor(
        () => {
          expect(screen.getByText(/verification failed/i)).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      expect(screen.getByText(/the verification link has expired/i)).toBeInTheDocument();
    });

    it('handles already verified error', async () => {
      mockSearchParams.set('token', 'already-used-token');

      mockServer.use(
        http.post(`*${endpoints.emailVerify.verifyEmail}`, () => {
          return HttpResponse.json(
            {
              success: false,
              error: {
                code: 'ALREADY_VERIFIED',
                message: 'This email address has already been verified.',
              },
            },
            { status: 400 },
          );
        }),
      );

      render(<VerifyEmailContent />);

      await waitFor(
        () => {
          expect(screen.getByText(/verification failed/i)).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      expect(screen.getByText(/this email address has already been verified/i)).toBeInTheDocument();
    });
  });

  describe('UI Elements', () => {
    it('displays Western logo', () => {
      mockSearchParams.set('token', 'valid-token');

      mockServer.use(
        http.post(`*${endpoints.emailVerify.verifyEmail}`, () => {
          return HttpResponse.json({
            success: true,
            data: { message: 'Email verified' },
          });
        }),
      );

      render(<VerifyEmailContent />);

      const logo = screen.getByAltText(/3d western logo/i);
      expect(logo).toBeInTheDocument();
    });

    it('uses singular "second" when countdown is 1', async () => {
      mockSearchParams.set('token', 'valid-token-123');

      mockServer.use(
        http.post(`*${endpoints.emailVerify.verifyEmail}`, () => {
          return HttpResponse.json({
            success: true,
            data: { message: 'Email verified successfully' },
          });
        }),
      );

      render(<VerifyEmailContent />);

      await waitFor(
        () => {
          expect(screen.getByText(/redirecting to login in 5 seconds/i)).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      // Wait for countdown to reach 1 second
      await waitFor(
        () => {
          expect(screen.getByText(/redirecting to login in 1 second\./i)).toBeInTheDocument();
        },
        { timeout: 5000 },
      );
    }, 10000);
  });
});
