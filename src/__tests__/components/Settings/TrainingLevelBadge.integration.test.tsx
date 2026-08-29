import { describe, it, expect } from 'vitest';
import { render, screen } from '@test/utils/render';
import { TrainingLevelBadge } from '@/app/(protected)/dashboard/settings/components/TrainingLevelBadge';

describe('TrainingLevelBadge Integration', () => {
  it('renders Level 1 correctly', () => {
    const { container } = render(<TrainingLevelBadge level="LEVEL_1" />);

    expect(screen.getByText('Level 1')).toBeInTheDocument();
    expect(container.querySelector('.bg-status-draft')).toBeInTheDocument();
  });

  it('renders Level 2 correctly', () => {
    const { container } = render(<TrainingLevelBadge level="LEVEL_2" />);

    expect(screen.getByText('Level 2')).toBeInTheDocument();
    expect(container.querySelector('.bg-status-success')).toBeInTheDocument();
  });
});
