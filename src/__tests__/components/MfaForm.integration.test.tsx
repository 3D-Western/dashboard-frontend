import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { sessionApi } from '@/api/client/session';
import { MFAForm } from '@/app/(auth)/mfa/mfa-form';
import { dropOtherUsersSubscription } from '@/lib/pwa/push';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/pwa/push', () => ({
  dropOtherUsersSubscription: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/api/client/session', () => ({
  sessionApi: { verifyMfa: vi.fn(), resendMfaOtp: vi.fn() },
}));

// The OTP input (input-otp) schedules a short timer; let it fire while the DOM still exists, so it can't run after the file's environment is torn down.
afterEach(async () => {
  cleanup();
  await new Promise((resolve) => setTimeout(resolve, 50));
});

describe('MFAForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the "verified" toast only briefly, so it does not linger over the next screen', async () => {
    vi.mocked(sessionApi.verifyMfa).mockResolvedValue({} as never);
    render(<MFAForm challengeId={7} />);

    await userEvent.type(screen.getByRole('textbox'), '123456');
    await userEvent.click(screen.getByRole('button', { name: /^verify$/i }));

    await waitFor(() => expect(sessionApi.verifyMfa).toHaveBeenCalledWith(7, '123456'));
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringMatching(/verified/i),
      expect.objectContaining({ duration: expect.any(Number) }),
    );
    const { duration } = vi.mocked(toast.success).mock.calls[0][1] as { duration: number };
    expect(duration).toBeLessThanOrEqual(2000);
  });

  it('gives the support link a real mailto address, not a dead "#"', () => {
    render(<MFAForm challengeId={7} />);

    const support = screen.getByRole('link', { name: /contact support/i });
    expect(support).toHaveAttribute('href', 'mailto:contact@3dwestern.ca');
    expect(support).toHaveClass('min-h-11');
  });

  it('makes "Resend code" a 44 px tap target on phones', () => {
    render(<MFAForm challengeId={7} />);

    expect(screen.getByRole('button', { name: /resend code/i })).toHaveClass('min-h-11');
  });

  it('after signing in, drops a push subscription left on this phone by the previous person', async () => {
    vi.mocked(sessionApi.verifyMfa).mockResolvedValue({} as never);
    render(<MFAForm challengeId={7} />);

    await userEvent.type(screen.getByRole('textbox'), '123456');
    await userEvent.click(screen.getByRole('button', { name: /^verify$/i }));

    await waitFor(() => expect(dropOtherUsersSubscription).toHaveBeenCalledTimes(1));
  });

  it('does not touch push subscriptions when the code is wrong', async () => {
    vi.mocked(sessionApi.verifyMfa).mockRejectedValue(new Error('bad code'));
    render(<MFAForm challengeId={7} />);

    await userEvent.type(screen.getByRole('textbox'), '123456');
    await userEvent.click(screen.getByRole('button', { name: /^verify$/i }));

    await waitFor(() => expect(sessionApi.verifyMfa).toHaveBeenCalled());
    expect(dropOtherUsersSubscription).not.toHaveBeenCalled();
  });
});
