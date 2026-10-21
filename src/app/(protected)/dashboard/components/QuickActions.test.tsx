import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen } from '@testing-library/react';
import { trainingAPI } from '@/api/client/training';
import { TrainingsProvider } from '@/providers/trainings-provider';
import type { MyTrainings } from '@/types/training';
import { QuickActions } from './QuickActions';

vi.mock('@/api/client/training', () => ({
  trainingAPI: { getMyTrainings: vi.fn() },
}));

const getMyTrainings = trainingAPI.getMyTrainings as Mock;

const renderActions = (data: Pick<MyTrainings, 'orientationComplete' | 'orientationRequired'>) => {
  getMyTrainings.mockResolvedValue({ ...data, trainings: [] });
  return render(
    <TrainingsProvider>
      <QuickActions />
    </TrainingsProvider>,
  );
};

beforeEach(() => vi.clearAllMocks());

describe('QuickActions: Events calendar', () => {
  it('opens the website calendar in a new tab, with its label wrapping inside the button', async () => {
    renderActions({ orientationComplete: true, orientationRequired: true });

    const link = await screen.findByRole('link', { name: /events calendar/i });
    expect(link).toHaveAttribute('target', '_blank');
    // The label wraps on narrow buttons instead of sticking out past the border
    expect(link.querySelector('span')).toHaveClass('min-w-0', 'whitespace-normal');
  });
});

describe('QuickActions: New print', () => {
  it('is locked, with a way to orientation, until Maker Orientation is done', async () => {
    renderActions({ orientationComplete: false, orientationRequired: true });

    const locked = await screen.findByRole('link', { name: /new print is locked/i });
    expect(locked).toHaveTextContent('Finish Maker Orientation to submit prints');
    expect(locked).toHaveAttribute('href', '/dashboard/training');
    expect(screen.queryByRole('link', { name: /^new print$/i })).not.toBeInTheDocument();
  });

  it('opens the print form once orientation is done', async () => {
    renderActions({ orientationComplete: true, orientationRequired: true });

    expect(await screen.findByRole('link', { name: /^new print$/i })).toHaveAttribute(
      'href',
      '/dashboard/jobs/print/new',
    );
    expect(screen.queryByRole('link', { name: /locked/i })).not.toBeInTheDocument();
  });

  it('is not locked when nothing is required (no orientation published, setting off, or staff)', async () => {
    renderActions({ orientationComplete: false, orientationRequired: false });

    expect(await screen.findByRole('link', { name: /^new print$/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /locked/i })).not.toBeInTheDocument();
  });

  it('is not locked while the training list is loading or if it fails to load', async () => {
    getMyTrainings.mockRejectedValue(new Error('offline'));
    render(
      <TrainingsProvider>
        <QuickActions />
      </TrainingsProvider>,
    );

    expect(screen.getByRole('link', { name: /^new print$/i })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: /^new print$/i })).toBeInTheDocument();
  });
});
