import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useAccountLimits, useUsageSummary } from '@/hooks/useUsage';
import { createMockUser } from '@test/utils/mockFactories';
import { UserProvider } from '@/providers/user-provider';
import type { ProjectTypeLimit } from '@/types/usage';
import { PrintAllowance } from './PrintAllowance';

vi.mock('@/hooks/useUsage', () => ({
  useAccountLimits: vi.fn(),
  useUsageSummary: vi.fn(),
}));

const mockAllowance = (limit: number, used: number) => {
  const limits: ProjectTypeLimit[] = [{ projectType: 'ThreeDPrint', limit, period: 'month' }];
  vi.mocked(useAccountLimits).mockReturnValue({
    limits,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  });
  vi.mocked(useUsageSummary).mockReturnValue({
    entries: used ? [{ projectType: 'ThreeDPrint', used, period: 'month' }] : [],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  });
};

const renderAllowance = () =>
  render(
    <UserProvider user={createMockUser()}>
      <PrintAllowance />
    </UserProvider>,
  );

describe('PrintAllowance', () => {
  beforeEach(() => {
    vi.mocked(useAccountLimits).mockReset();
    vi.mocked(useUsageSummary).mockReset();
  });

  it('shows how many prints are left this period', () => {
    mockAllowance(5, 2);
    renderAllowance();
    expect(screen.getByText('3 of 5 prints left this month')).toBeInTheDocument();
    expect(screen.getByText(/^Resets /)).toBeInTheDocument();
  });

  it('tells the user when they have no prints left', () => {
    mockAllowance(5, 5);
    renderAllowance();
    expect(screen.getByText(/you've used all 5 prints for this month/i)).toBeInTheDocument();
    expect(screen.getByText(/you can submit again on /i)).toBeInTheDocument();
  });

  it('shows nothing for unlimited accounts', () => {
    mockAllowance(-1, 12);
    const { container } = renderAllowance();
    expect(container).toBeEmptyDOMElement();
  });
});
