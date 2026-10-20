import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { redirect } from 'next/navigation';
import { validateSession } from '@/lib/auth';
import { onboardingAPI } from '@/api/client/onboarding';
import { trainingAPI } from '@/api/client/training';
import { AgreementsGate } from '@/components/Agreements/AgreementsGate';
import { createMockUser } from '@test/utils/mockFactories';
import { createAgreement } from '@test/utils/trainingFactories';
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

vi.mock('@/api/client/training', () => ({
  trainingAPI: {
    getPendingAgreements: vi.fn(),
  },
}));

const pending = trainingAPI.getPendingAgreements as Mock;

describe('ProtectedLayout onboarding gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pending.mockResolvedValue([]);
  });

  it('redirects to login when there is no session', async () => {
    (validateSession as Mock).mockResolvedValue(null);

    await expect(ProtectedLayout({ children: <div /> })).rejects.toThrow('REDIRECT');

    expect(redirect).toHaveBeenCalledWith('/login?error=unauthenticated');
    expect(onboardingAPI.getStatus).not.toHaveBeenCalled();
    expect(pending).not.toHaveBeenCalled();
  });

  it('does not check onboarding status while the check is disabled (TEMP toggle)', async () => {
    (validateSession as Mock).mockResolvedValue(createMockUser());

    await expect(ProtectedLayout({ children: <div /> })).resolves.toBeTruthy();

    expect(onboardingAPI.getStatus).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe('ProtectedLayout agreements gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (validateSession as Mock).mockResolvedValue(createMockUser());
  });

  it('shows the acceptance screen instead of the dashboard while agreements are pending', async () => {
    const agreements = [createAgreement()];
    pending.mockResolvedValue(agreements);
    const page = <div data-testid="dashboard-page" />;

    const result = await ProtectedLayout({ children: page });

    expect(result.type).toBe(AgreementsGate);
    expect(result.props.agreements).toEqual(agreements);
    // The page itself is not part of what is rendered
    expect(JSON.stringify(result.props)).not.toContain('dashboard-page');
  });

  it('shows the dashboard shell when nothing is pending', async () => {
    pending.mockResolvedValue([]);

    const result = await ProtectedLayout({ children: <div /> });

    expect(result.type).not.toBe(AgreementsGate);
  });

  it('does not lock members out if the agreements cannot be loaded', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    pending.mockRejectedValue(new Error('backend down'));

    const result = await ProtectedLayout({ children: <div /> });

    expect(result.type).not.toBe(AgreementsGate);
    consoleError.mockRestore();
  });
});
