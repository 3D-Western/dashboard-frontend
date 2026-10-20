import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@test/utils/render';
import { trainingAPI } from '@/api/client/training';
import { usageAPI } from '@/api/client/usage';
import { createMockUser } from '@test/utils/mockFactories';
import { SettingsContent } from './settings-content';

vi.mock('@/api/client/training', () => ({
  trainingAPI: { getMyTrainings: vi.fn() },
}));
vi.mock('@/api/client/usage', () => ({
  usageAPI: { getUsageSummary: vi.fn(), getAccountLimits: vi.fn() },
}));

describe('SettingsContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(trainingAPI.getMyTrainings).mockResolvedValue({
      orientationComplete: false,
      orientationRequired: true,
      trainings: [],
    });
  });

  it('does not show or call the Usage and Limits cards (their endpoints do not exist yet)', async () => {
    render(<SettingsContent />, { user: createMockUser() });

    // wait for the cards that do exist
    expect(await screen.findByText('Training Status')).toBeInTheDocument();
    expect(screen.getByText('Change Password')).toBeInTheDocument();

    expect(screen.queryByText(/usage summary|print usage|usage/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/limits/i)).not.toBeInTheDocument();
    expect(usageAPI.getUsageSummary).not.toHaveBeenCalled();
    expect(usageAPI.getAccountLimits).not.toHaveBeenCalled();
  });
});
