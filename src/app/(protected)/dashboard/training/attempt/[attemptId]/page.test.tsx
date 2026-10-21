import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import TrainingAttemptPage from './page';

vi.mock('@/components/Training/TrainingPlayer', () => ({ TrainingPlayer: () => null }));

describe('TrainingAttemptPage layout', () => {
  it('keeps the player at a readable width: 768 px, then 1024 px from xl', async () => {
    const { container } = render(
      await TrainingAttemptPage({ params: Promise.resolve({ attemptId: '3' }) }),
    );

    expect(container.firstElementChild).toHaveClass('max-w-3xl', 'xl:max-w-5xl');
  });
});
