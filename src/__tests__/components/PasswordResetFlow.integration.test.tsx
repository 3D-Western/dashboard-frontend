/* eslint-disable @next/next/no-img-element */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@test/utils/render';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { mockServer } from '@/api/mocks';
import { endpoints } from '@/api/client/endpoints';
import { ForgotPasswordForm } from '@/app/(auth)/forgot-password/forgot-password-form';
import { ResetPasswordForm } from '@/app/(auth)/reset-password/reset-password-form';
import { suppressConsoleError } from '@test/utils/testUtils';
import { Routes } from '@/lib/routes';
import { toast } from 'sonner';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => ({
    get: (key: string) => (key === 'token' ? 'test-token' : null),
  }),
}));

vi.mock('next/image', () => ({
  default: ({ alt, fill: _fill, ...props }: React.ComponentProps<'img'> & { fill?: boolean }) => (
    <img alt={alt} {...props} />
  ),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Password Reset Flow Integration', () => {
  beforeEach(() => {
    mockPush.mockClear();
    vi.clearAllMocks();
  });

  it('validates student ID in ForgotPasswordForm', async () => {
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);

    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    expect(await screen.findByText(/student id is required/i)).toBeInTheDocument();
  });

  it('submits ForgotPasswordForm successfully', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post(`*${endpoints.resetPassword.forgotPassword}`, () => {
        return HttpResponse.json({
          success: true,
          data: { message: 'ok' },
        });
      }),
    );

    render(<ForgotPasswordForm />);

    await user.type(screen.getByLabelText(/student id/i), '251000001');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    expect(await screen.findByText(/check your email/i)).toBeInTheDocument();
  });

  it('shows loading state while sending reset code', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post(`*${endpoints.resetPassword.forgotPassword}`, async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return HttpResponse.json({
          success: true,
          data: { message: 'ok' },
        });
      }),
    );

    render(<ForgotPasswordForm />);

    await user.type(screen.getByLabelText(/student id/i), '251000001');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sending/i })).toBeDisabled();
    });
  });

  it('shows success message even when request fails', async () => {
    const user = userEvent.setup();
    const restoreConsole = suppressConsoleError();

    mockServer.use(
      http.post(`*${endpoints.resetPassword.forgotPassword}`, () => {
        return HttpResponse.json(
          {
            success: false,
            error: { code: 'UNKNOWN_ERROR', message: 'Failure' },
          },
          { status: 400 },
        );
      }),
    );

    render(<ForgotPasswordForm />);

    await user.type(screen.getByLabelText(/student id/i), '251000001');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    expect(await screen.findByText(/check your email/i)).toBeInTheDocument();
    restoreConsole();
  });

  it('returns to login from success state in ForgotPasswordForm', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post(`*${endpoints.resetPassword.forgotPassword}`, () => {
        return HttpResponse.json({
          success: true,
          data: { message: 'ok' },
        });
      }),
    );

    render(<ForgotPasswordForm />);

    await user.type(screen.getByLabelText(/student id/i), '251000001');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    const returnButton = await screen.findByRole('button', { name: /return to login/i });
    await user.click(returnButton);

    expect(mockPush).toHaveBeenCalledWith(Routes.login);
  });

  it('validates password requirements', async () => {
    const user = userEvent.setup();
    render(<ResetPasswordForm />);

    await user.type(screen.getByLabelText(/new password/i), 'short');
    await user.type(screen.getByLabelText(/confirm password/i), 'short');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    expect(await screen.findByText(/password must be at least 10 characters/i)).toBeInTheDocument();
  });

  it('validates password confirmation match', async () => {
    const user = userEvent.setup();
    render(<ResetPasswordForm />);

    await user.type(screen.getByLabelText(/new password/i), 'password123456');
    await user.type(screen.getByLabelText(/confirm password/i), 'password654321');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    expect(await screen.findByText(/passwords don't match/i)).toBeInTheDocument();
  });

  it('shows error for invalid reset token', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post(`*${endpoints.resetPassword.resetPassword}`, () => {
        return HttpResponse.json(
          {
            success: false,
            error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' },
          },
          { status: 400 },
        );
      }),
    );

    render(<ResetPasswordForm />);

    await user.type(screen.getByLabelText(/new password/i), 'password123456');
    await user.type(screen.getByLabelText(/confirm password/i), 'password123456');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('Invalid or expired reset token'),
      );
    });
  });

  it('submits ResetPasswordForm successfully', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post(`*${endpoints.resetPassword.resetPassword}`, () => {
        return HttpResponse.json({
          success: true,
          data: null,
        });
      }),
    );

    render(<ResetPasswordForm />);

    await user.type(screen.getByLabelText(/new password/i), 'password123456');
    await user.type(screen.getByLabelText(/confirm password/i), 'password123456');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining('Password reset successful'),
      );
      expect(mockPush).toHaveBeenCalledWith(Routes.login);
    });
  });

  it('shows loading state while resetting password', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post(`*${endpoints.resetPassword.resetPassword}`, async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return HttpResponse.json({
          success: true,
          data: null,
        });
      }),
    );

    render(<ResetPasswordForm />);

    await user.type(screen.getByLabelText(/new password/i), 'password123456');
    await user.type(screen.getByLabelText(/confirm password/i), 'password123456');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /resetting/i })).toBeDisabled();
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /reset password/i })).toBeEnabled();
    });

    mockServer.resetHandlers();
  });

  it('completes the full password reset flow', async () => {
    const user = userEvent.setup();
    const requestPayloads: Array<{ studentId: number }> = [];
    const resetPayloads: Array<{ token: string; newPassword: string }> = [];

    mockServer.use(
      http.post(`*${endpoints.resetPassword.forgotPassword}`, async ({ request }) => {
        requestPayloads.push(await request.json());
        return HttpResponse.json({
          success: true,
          data: null,
        });
      }),
      http.post(`*${endpoints.resetPassword.resetPassword}`, async ({ request }) => {
        resetPayloads.push(await request.json());
        return HttpResponse.json({
          success: true,
          data: null,
        });
      }),
    );

    // Step 1: Request password reset
    render(<ForgotPasswordForm />);
    await user.type(screen.getByLabelText(/student id/i), '251000001');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));
    expect(await screen.findByText(/check your email/i)).toBeInTheDocument();

    // Step 2: User receives email with token link and resets password
    render(<ResetPasswordForm />);
    await user.type(screen.getByLabelText(/new password/i), 'password123456');
    await user.type(screen.getByLabelText(/confirm password/i), 'password123456');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining('Password reset successful'),
      );
      expect(mockPush).toHaveBeenCalledWith(Routes.login);
    });

    expect(requestPayloads[0]).toEqual({ studentId: 251000001 });
    expect(resetPayloads[0]).toEqual({
      token: 'test-token',
      newPassword: 'password123456',
    });
  });
});
