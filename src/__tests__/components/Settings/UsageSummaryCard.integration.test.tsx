import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { render, screen } from '@test/utils/render';
import { UsageSummaryCard } from '@/app/(protected)/dashboard/settings/components/UsageSummaryCard';
import { useUser } from '@/providers/user-provider';
import { useUsageSummary, useAccountLimits } from '@/hooks/useUsage';

vi.mock('@/providers/user-provider', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/providers/user-provider')>();
  return {
    ...actual,
    useUser: vi.fn(),
  };
});

vi.mock('@/hooks/useUsage', () => ({
  useUsageSummary: vi.fn(),
  useAccountLimits: vi.fn(),
}));

describe('UsageSummaryCard Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useUser as Mock).mockReturnValue({ studentId: 251000002 });
  });

  it('renders a loading skeleton while fetching', () => {
    (useUsageSummary as Mock).mockReturnValue({
      entries: [],
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });
    (useAccountLimits as Mock).mockReturnValue({
      limits: [],
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });

    render(<UsageSummaryCard />);

    expect(screen.getByRole('status', { name: /loading current usage/i })).toBeInTheDocument();
  });

  it('renders an error state with a working retry button', () => {
    const refetchUsage = vi.fn();
    const refetchLimits = vi.fn();
    (useUsageSummary as Mock).mockReturnValue({
      entries: [],
      isLoading: false,
      error: 'Failed to fetch',
      refetch: refetchUsage,
    });
    (useAccountLimits as Mock).mockReturnValue({
      limits: [],
      isLoading: false,
      error: null,
      refetch: refetchLimits,
    });

    render(<UsageSummaryCard />);

    screen.getByRole('button', { name: /retry/i }).click();
    expect(refetchUsage).toHaveBeenCalled();
    expect(refetchLimits).toHaveBeenCalled();
  });

  it('renders an empty state when there are no limits configured', () => {
    (useUsageSummary as Mock).mockReturnValue({
      entries: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    (useAccountLimits as Mock).mockReturnValue({
      limits: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<UsageSummaryCard />);

    expect(screen.getByText('No usage yet')).toBeInTheDocument();
  });

  it('renders a usage meter for each project type limit', () => {
    (useUsageSummary as Mock).mockReturnValue({
      entries: [{ projectType: 'ThreeDPrint', used: 5, period: 'month' }],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    (useAccountLimits as Mock).mockReturnValue({
      limits: [
        { projectType: 'ThreeDPrint', limit: 5, period: 'month' },
        { projectType: 'Waterjet', limit: -1, period: 'month' },
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<UsageSummaryCard />);

    expect(screen.getByText('3D Printing')).toBeInTheDocument();
    expect(screen.getByText('Waterjet')).toBeInTheDocument();
    expect(screen.getByText('Limit Reached')).toBeInTheDocument();
  });
});
