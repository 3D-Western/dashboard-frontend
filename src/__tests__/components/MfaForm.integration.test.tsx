import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { sessionApi } from '@/api/client/session';
import { MFAForm } from '@/app/(auth)/mfa/mfa-form';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/api/client/session', () => ({
  sessionApi: { verifyMfa: vi.fn(), resendMfaOtp: vi.fn() },
}));

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
});
