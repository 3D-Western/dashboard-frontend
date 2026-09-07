import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { redirect } from 'next/navigation';
import { validateSession } from '@/lib/auth';
import { onboardingAPI } from '@/api/client/onboarding';
import { createMockUser } from '@test/utils/mockFactories';
import ProtectedLayout from './layout';

vi.mock('next/navigation', () => ({
  redirect: vi.fn(() => {
    throw new Error('REDIRECT');
  }),
}));

vi.mock('@/lib/auth', () => ({
  validateSession: vi.fn(),
}));

vi.mock('@/api/client/onboarding', () => ({
  onboardingAPI: {
    getStatus: vi.fn(),
  },
}));

describe('ProtectedLayout onboarding gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects to login when there is no session', async () => {
    (validateSession as Mock).mockResolvedValue(null);

    await expect(ProtectedLayout({ children: <div /> })).rejects.toThrow('REDIRECT');

    expect(redirect).toHaveBeenCalledWith('/login?error=unauthenticated');
    expect(onboardingAPI.getStatus).not.toHaveBeenCalled();
  });

  it('does not check onboarding status while the check is disabled (TEMP toggle)', async () => {
    (validateSession as Mock).mockResolvedValue(createMockUser());

    await expect(ProtectedLayout({ children: <div /> })).resolves.toBeTruthy();

    expect(onboardingAPI.getStatus).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });
});
