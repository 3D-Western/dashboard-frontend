import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { render, screen } from '@test/utils/render';
import { LimitCard } from '@/app/(protected)/dashboard/settings/components/LimitCard';
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

describe('LimitCard Integration', () => {
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

    render(<LimitCard />);

    expect(screen.getByRole('status', { name: /loading account limits/i })).toBeInTheDocument();
  });

  it('renders an error state', () => {
    (useUsageSummary as Mock).mockReturnValue({
      entries: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    (useAccountLimits as Mock).mockReturnValue({
      limits: [],
      isLoading: false,
      error: 'Failed to fetch',
      refetch: vi.fn(),
    });

    render(<LimitCard />);

    expect(screen.getByText(/unable to load your account limits/i)).toBeInTheDocument();
  });

  it('does not show the limit-reached banner when all categories are under limit', () => {
    (useUsageSummary as Mock).mockReturnValue({
      entries: [{ projectType: 'ThreeDPrint', used: 1, period: 'month' }],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    (useAccountLimits as Mock).mockReturnValue({
      limits: [{ projectType: 'ThreeDPrint', limit: 5, period: 'month' }],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<LimitCard />);

    expect(screen.queryByText('Limit reached')).not.toBeInTheDocument();
    expect(screen.getByText('5 per month')).toBeInTheDocument();
  });

  it('shows the limit-reached banner and per-category badge when a category is at limit', () => {
    (useUsageSummary as Mock).mockReturnValue({
      entries: [{ projectType: 'ThreeDPrint', used: 5, period: 'month' }],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    (useAccountLimits as Mock).mockReturnValue({
      limits: [{ projectType: 'ThreeDPrint', limit: 5, period: 'month' }],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<LimitCard />);

    expect(screen.getByText('Limit reached')).toBeInTheDocument();
    expect(screen.getByText('Limit Reached')).toBeInTheDocument();
  });

  it('shows Unlimited for categories without a cap', () => {
    (useUsageSummary as Mock).mockReturnValue({
      entries: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    (useAccountLimits as Mock).mockReturnValue({
      limits: [{ projectType: 'Waterjet', limit: -1, period: 'month' }],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<LimitCard />);

    expect(screen.getByText('Unlimited')).toBeInTheDocument();
  });
});
