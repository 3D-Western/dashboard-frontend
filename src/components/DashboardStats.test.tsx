import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import DashboardStats from './DashboardStats';
import { userApi } from '@/api/client/user';
import type { CurrentUserJobListParams } from '@/types/common';
import type { PrintJobListResponse } from '@/api/types';

vi.mock('@/api/client/user', () => ({
  userApi: {
    getCurrentUserJobs: vi.fn(),
  },
}));

const responseWithTotal = (totalItems: number): PrintJobListResponse =>
  ({
    data: [],
    pagination: {
      page: 1,
      pageSize: 1,
      totalItems,
      totalPages: totalItems > 0 ? 1 : 0,
      hasNext: false,
      hasPrevious: false,
      snapshotCreatedBefore: new Date().toISOString(),
    },
  }) as PrintJobListResponse;

describe('DashboardStats', () => {
  beforeEach(() => {
    vi.mocked(userApi.getCurrentUserJobs).mockReset();
  });

  it('shows per-status counts instead of a hardcoded 0 or duplicated total', async () => {
    vi.mocked(userApi.getCurrentUserJobs).mockImplementation(
      async (params?: CurrentUserJobListParams) => {
        if (params?.status === 'Printing') return responseWithTotal(2);
        if (params?.status === 'PendingFile') return responseWithTotal(1);
        if (params?.status === 'InQueue') return responseWithTotal(3);
        return responseWithTotal(10);
      },
    );

    render(<DashboardStats />);

    await waitFor(() => {
      expect(screen.queryByText('...')).not.toBeInTheDocument();
    });

    // Active Prints = Printing (2)
    // Pending Prints = PendingFile (1) + InQueue (3) = 4
    // Total Prints = unfiltered total (10)
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('falls back to 0 for each stat on a fetch failure', async () => {
    vi.mocked(userApi.getCurrentUserJobs).mockRejectedValue(new Error('network error'));

    render(<DashboardStats />);

    await waitFor(() => {
      expect(screen.queryByText('...')).not.toBeInTheDocument();
    });

    expect(screen.getAllByText('0').length).toBe(3);
  });
});
