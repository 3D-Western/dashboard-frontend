import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen } from '@testing-library/react';
import { trainingAPI } from '@/api/client/training';
import { PrintSubmissionGate } from './PrintSubmissionGate';

vi.mock('@/api/client/training', () => ({
  trainingAPI: { getMyTrainings: vi.fn() },
}));

// The form itself is covered by PrintJobForm.test.tsx
vi.mock('./PrintJobForm', () => ({ default: () => <form aria-label="Print job form" /> }));

const getMyTrainings = trainingAPI.getMyTrainings as Mock;

beforeEach(() => vi.clearAllMocks());

describe('PrintSubmissionGate', () => {
  it('shows the locked state instead of the form until orientation is done', async () => {
    getMyTrainings.mockResolvedValue({
      orientationComplete: false,
      orientationRequired: true,
      trainings: [],
    });
    render(<PrintSubmissionGate />);

    expect(
      await screen.findByRole('heading', { name: 'Finish Maker Orientation to submit prints' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /go to maker orientation/i })).toBeInTheDocument();
    expect(screen.queryByRole('form', { name: 'Print job form' })).not.toBeInTheDocument();
  });

  it('shows the form once orientation is done', async () => {
    getMyTrainings.mockResolvedValue({
      orientationComplete: true,
      orientationRequired: true,
      trainings: [],
    });
    render(<PrintSubmissionGate />);

    expect(await screen.findByRole('form', { name: 'Print job form' })).toBeInTheDocument();
    expect(screen.queryByText(/finish maker orientation/i)).not.toBeInTheDocument();
  });

  it('shows the form when no orientation is published or the setting is off', async () => {
    getMyTrainings.mockResolvedValue({
      orientationComplete: false,
      orientationRequired: false,
      trainings: [],
    });
    render(<PrintSubmissionGate />);

    expect(await screen.findByRole('form', { name: 'Print job form' })).toBeInTheDocument();
  });

  it('shows the form if the training list cannot be loaded (the server still decides)', async () => {
    getMyTrainings.mockRejectedValue(new Error('offline'));
    render(<PrintSubmissionGate />);

    expect(await screen.findByRole('form', { name: 'Print job form' })).toBeInTheDocument();
  });
});
