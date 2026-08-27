import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { render, screen } from '@test/utils/render';
import { TrainingStatusCard } from '@/app/(protected)/dashboard/settings/components/TrainingStatusCard';
import { useTrainingLevel } from '@/hooks/useTraining';

vi.mock('@/hooks/useTraining', () => ({
  useTrainingLevel: vi.fn(),
}));

describe('TrainingStatusCard Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a loading skeleton while fetching', () => {
    (useTrainingLevel as Mock).mockReturnValue({
      trainingLevel: null,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });

    render(<TrainingStatusCard />);

    expect(screen.getByRole('status', { name: /loading training status/i })).toBeInTheDocument();
  });

  it('renders an error state', () => {
    (useTrainingLevel as Mock).mockReturnValue({
      trainingLevel: null,
      isLoading: false,
      error: 'Failed to fetch',
      refetch: vi.fn(),
    });

    render(<TrainingStatusCard />);

    expect(screen.getByText(/unable to load your training status/i)).toBeInTheDocument();
  });

  it('renders an empty state when no training level is set', () => {
    (useTrainingLevel as Mock).mockReturnValue({
      trainingLevel: null,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<TrainingStatusCard />);

    expect(screen.getByText('No training status')).toBeInTheDocument();
  });

  it('shows Level 1 without a certificate note and "required" copy', () => {
    (useTrainingLevel as Mock).mockReturnValue({
      trainingLevel: 'LEVEL_1',
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<TrainingStatusCard />);

    expect(screen.getByText('Level 1')).toBeInTheDocument();
    expect(screen.queryByText('Certificate Acquired')).not.toBeInTheDocument();
    expect(screen.getByText(/required to book equipment/i)).toBeInTheDocument();
  });

  it('shows Level 2 with a certificate note and "can book" copy', () => {
    (useTrainingLevel as Mock).mockReturnValue({
      trainingLevel: 'LEVEL_2',
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<TrainingStatusCard />);

    expect(screen.getByText('Level 2')).toBeInTheDocument();
    expect(screen.getByText('Certificate Acquired')).toBeInTheDocument();
    expect(screen.getByText(/you can book equipment/i)).toBeInTheDocument();
  });
});
