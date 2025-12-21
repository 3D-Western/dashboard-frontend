/* eslint-disable @next/next/no-img-element */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@test/utils/render';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { mockServer } from '@/api/mocks';
import { endpoints } from '@/api/client/endpoints';
import { ForgotPasswordForm } from '@/app/forgot-password/forgot-password-form';
import { ResetPasswordForm } from '@/app/reset-password/reset-password-form';
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

    await user.click(screen.getByRole('button', { name: /send reset code/i }));

    expect(await screen.findByText(/student id is required/i)).toBeInTheDocument();
  });

  it('submits ForgotPasswordForm successfully', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post(`*${endpoints.passwordReset.request}`, () => {
        return HttpResponse.json({
          success: true,
          data: { message: 'ok' },
        });
      }),
    );

    render(<ForgotPasswordForm />);

    await user.type(screen.getByLabelText(/student id/i), '251000001');
    await user.click(screen.getByRole('button', { name: /send reset code/i }));

    expect(await screen.findByText(/check your email/i)).toBeInTheDocument();
  });

  it('shows success message even when request fails', async () => {
    const user = userEvent.setup();
    const restoreConsole = suppressConsoleError();

    mockServer.use(
      http.post(`*${endpoints.passwordReset.request}`, () => {
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
    await user.click(screen.getByRole('button', { name: /send reset code/i }));

    expect(await screen.findByText(/check your email/i)).toBeInTheDocument();
    restoreConsole();
  });

  it('validates reset code in ResetPasswordForm', async () => {
    const user = userEvent.setup();
    render(<ResetPasswordForm />);

    await user.type(screen.getByLabelText(/student id/i), '251000001');
    await user.type(screen.getByLabelText(/reset code/i), '123');
    await user.type(screen.getByLabelText(/new password/i), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    expect(await screen.findByText(/reset code must be exactly 6 digits/i)).toBeInTheDocument();
  });

  it('validates password requirements', async () => {
    const user = userEvent.setup();
    render(<ResetPasswordForm />);

    await user.type(screen.getByLabelText(/student id/i), '251000001');
    await user.type(screen.getByLabelText(/reset code/i), '123456');
    await user.type(screen.getByLabelText(/new password/i), 'short');
    await user.type(screen.getByLabelText(/confirm password/i), 'short');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    expect(await screen.findByText(/password must be at least 8 characters/i)).toBeInTheDocument();
  });

  it('validates password confirmation match', async () => {
    const user = userEvent.setup();
    render(<ResetPasswordForm />);

    await user.type(screen.getByLabelText(/student id/i), '251000001');
    await user.type(screen.getByLabelText(/reset code/i), '123456');
    await user.type(screen.getByLabelText(/new password/i), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'password456');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    expect(await screen.findByText(/passwords don't match/i)).toBeInTheDocument();
  });

  it('shows error for invalid reset code', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post(`*${endpoints.passwordReset.verify}`, () => {
        return HttpResponse.json(
          {
            success: false,
            error: { code: 'INVALID_RESET_CODE', message: 'Invalid code' },
          },
          { status: 400 },
        );
      }),
    );

    render(<ResetPasswordForm />);

    await user.type(screen.getByLabelText(/student id/i), '251000001');
    await user.type(screen.getByLabelText(/reset code/i), '123456');
    await user.type(screen.getByLabelText(/new password/i), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('Invalid reset code or student ID'),
      );
    });
  });

  it('submits ResetPasswordForm successfully', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post(`*${endpoints.passwordReset.verify}`, () => {
        return HttpResponse.json({
          success: true,
          data: { message: 'Verified', resetToken: 'reset-token-123' },
        });
      }),
      http.post(`*${endpoints.passwordReset.complete}`, () => {
        return HttpResponse.json({
          success: true,
          data: { message: 'Reset complete' },
        });
      }),
    );

    render(<ResetPasswordForm />);

    await user.type(screen.getByLabelText(/student id/i), '251000001');
    await user.type(screen.getByLabelText(/reset code/i), '123456');
    await user.type(screen.getByLabelText(/new password/i), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining('Password reset successful'),
      );
      expect(mockPush).toHaveBeenCalledWith(Routes.login);
    });
  });

  it('completes the full password reset flow', async () => {
    const user = userEvent.setup();
    const requestPayloads: Array<{ studentId: number }> = [];
    const verifyPayloads: Array<{ studentId: number; code: string }> = [];
    const completePayloads: Array<{ resetToken: string; newPassword: string }> = [];

    mockServer.use(
      http.post(`*${endpoints.passwordReset.request}`, async ({ request }) => {
        requestPayloads.push(await request.json());
        return HttpResponse.json({
          success: true,
          data: { message: 'Request accepted' },
        });
      }),
      http.post(`*${endpoints.passwordReset.verify}`, async ({ request }) => {
        verifyPayloads.push(await request.json());
        return HttpResponse.json({
          success: true,
          data: { message: 'Verified', resetToken: 'reset-token-456' },
        });
      }),
      http.post(`*${endpoints.passwordReset.complete}`, async ({ request }) => {
        completePayloads.push(await request.json());
        return HttpResponse.json({
          success: true,
          data: { message: 'Reset complete' },
        });
      }),
    );

    render(<ForgotPasswordForm />);
    await user.type(screen.getByLabelText(/student id/i), '251000001');
    await user.click(screen.getByRole('button', { name: /send reset code/i }));
    expect(await screen.findByText(/check your email/i)).toBeInTheDocument();

    render(<ResetPasswordForm />);
    await user.type(screen.getByLabelText(/student id/i), '251000001');
    await user.type(screen.getByLabelText(/reset code/i), '123456');
    await user.type(screen.getByLabelText(/new password/i), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining('Password reset successful'),
      );
      expect(mockPush).toHaveBeenCalledWith(Routes.login);
    });

    expect(requestPayloads[0]).toEqual({ studentId: 251000001 });
    expect(verifyPayloads[0]).toEqual({ studentId: 251000001, code: '123456' });
    expect(completePayloads[0]).toEqual({
      resetToken: 'reset-token-456',
      newPassword: 'password123',
    });
  });
});
