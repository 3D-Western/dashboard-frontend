import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen } from '@test/utils/render';
import userEvent from '@testing-library/user-event';
import { TrainingStatusCard } from '@/app/(protected)/dashboard/settings/components/TrainingStatusCard';
import { trainingAPI } from '@/api/client/training';
import { createTrainingSummary } from '@test/utils/trainingFactories';
import type { Certification } from '@/types/training';

vi.mock('@/api/client/training', () => ({
  trainingAPI: { getMyTrainings: vi.fn() },
}));

const getMyTrainings = trainingAPI.getMyTrainings as Mock;

const cert = (overrides: Partial<Certification> = {}): Certification => ({
  status: 'ACTIVE',
  activeSince: '2026-09-01T12:00:00Z',
  expiresAt: null,
  addonRequired: false,
  addonDueAt: null,
  ...overrides,
});

describe('TrainingStatusCard (certifications)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a loading skeleton while fetching', () => {
    getMyTrainings.mockReturnValue(new Promise(() => undefined));

    render(<TrainingStatusCard />);

    expect(screen.getByRole('status', { name: /loading training status/i })).toBeInTheDocument();
  });

  it('renders an error state with a retry', async () => {
    getMyTrainings.mockRejectedValueOnce(new Error('Failed to fetch'));

    render(<TrainingStatusCard />);

    expect(await screen.findByText(/unable to load your training status/i)).toBeInTheDocument();

    getMyTrainings.mockResolvedValue({
      orientationComplete: true,
      orientationRequired: true,
      trainings: [],
    });
    await userEvent.click(screen.getByRole('button', { name: /try again|retry/i }));
    expect(await screen.findByText('No certifications yet')).toBeInTheDocument();
  });

  it('renders an empty state with a link to training when nothing is started', async () => {
    getMyTrainings.mockResolvedValue({
      orientationComplete: false,
      orientationRequired: true,
      trainings: [createTrainingSummary()],
    });

    render(<TrainingStatusCard />);

    expect(await screen.findByText('No certifications yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /go to training/i })).toHaveAttribute(
      'href',
      '/dashboard/training',
    );
  });

  it('lists each certification with its status and when it is valid', async () => {
    getMyTrainings.mockResolvedValue({
      orientationComplete: true,
      orientationRequired: true,
      trainings: [
        createTrainingSummary({
          slug: 'orientation',
          title: 'Maker Orientation',
          certification: cert(),
        }),
        createTrainingSummary({
          slug: 'laser',
          title: 'Laser Cutter',
          kind: 'EQUIPMENT',
          certification: cert({ status: 'AWAITING_SIGNOFF', activeSince: null }),
        }),
        createTrainingSummary({
          slug: 'cnc',
          title: 'CNC Router',
          kind: 'EQUIPMENT',
          certification: cert({ status: 'ACTIVE', expiresAt: '2099-06-15T12:00:00Z' }),
        }),
        createTrainingSummary({ slug: 'print', title: '3D Printing', kind: 'EQUIPMENT' }),
      ],
    });

    render(<TrainingStatusCard />);

    expect(await screen.findByText('Maker Orientation')).toBeInTheDocument();
    expect(screen.getByText('Laser Cutter')).toBeInTheDocument();
    expect(screen.getByText('CNC Router')).toBeInTheDocument();
    // Not started yet: not listed as a certification
    expect(screen.queryByText('3D Printing')).not.toBeInTheDocument();
    expect(screen.getByText('Awaiting sign-off')).toBeInTheDocument();
    expect(screen.getAllByText('Certified')).toHaveLength(2);
    expect(screen.getByText(/certified since/i)).toBeInTheDocument();
    expect(screen.getByText(/valid until .*2099/i)).toBeInTheDocument();
  });

  it('shows an add-on deadline', async () => {
    getMyTrainings.mockResolvedValue({
      orientationComplete: true,
      orientationRequired: true,
      trainings: [
        createTrainingSummary({
          certification: cert({ addonRequired: true, addonDueAt: '2099-02-01T00:00:00Z' }),
        }),
      ],
    });

    render(<TrainingStatusCard />);

    expect(await screen.findByText(/new material due by/i)).toBeInTheDocument();
  });

  it('no longer has the test-only level toggle', async () => {
    getMyTrainings.mockResolvedValue({
      orientationComplete: true,
      orientationRequired: true,
      trainings: [createTrainingSummary({ certification: cert() })],
    });

    render(<TrainingStatusCard />);
    await screen.findByText('Maker Orientation');

    expect(screen.queryByRole('button', { name: /level/i })).not.toBeInTheDocument();
  });
});
