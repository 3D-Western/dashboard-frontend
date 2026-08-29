import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { redirect } from 'next/navigation';
import { validateSession } from '@/lib/auth';
import { onboardingAPI } from '@/api/client/onboarding';
import { Routes } from '@/lib/routes';
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

  it('redirects to onboarding when the session exists but onboarding is incomplete', async () => {
    (validateSession as Mock).mockResolvedValue(createMockUser());
    (onboardingAPI.getStatus as Mock).mockResolvedValue({ onboardingCompleted: false });

    await expect(ProtectedLayout({ children: <div /> })).rejects.toThrow('REDIRECT');

    expect(redirect).toHaveBeenCalledWith(Routes.onboarding);
  });

  it('does not redirect when the session exists and onboarding is complete', async () => {
    (validateSession as Mock).mockResolvedValue(createMockUser());
    (onboardingAPI.getStatus as Mock).mockResolvedValue({ onboardingCompleted: true });

    await expect(ProtectedLayout({ children: <div /> })).resolves.toBeTruthy();

    expect(redirect).not.toHaveBeenCalled();
  });
});
