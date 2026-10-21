import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import TrainingReviewPage from './page';

const reviewProps = vi.fn();
vi.mock('@/components/Training/TrainingReview', () => ({
  TrainingReview: (props: unknown) => {
    reviewProps(props);
    return null;
  },
}));
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NOT_FOUND');
  },
}));

const page = (attemptId: string, step?: string) =>
  TrainingReviewPage({
    params: Promise.resolve({ attemptId }),
    searchParams: Promise.resolve({ step }),
  });

describe('TrainingReviewPage', () => {
  it('keeps the material at a readable width, like the player', async () => {
    const { container } = render(await page('3'));

    expect(container.firstElementChild).toHaveClass('max-w-3xl', 'xl:max-w-5xl', 'short:py-2');
  });

  it('passes the attempt and the section to open on', async () => {
    render(await page('3', '12'));

    expect(reviewProps).toHaveBeenLastCalledWith({ attemptId: 3, initialStepId: 12 });
  });

  it('ignores a section that is not a number', async () => {
    render(await page('3', 'abc'));

    expect(reviewProps).toHaveBeenLastCalledWith({ attemptId: 3, initialStepId: null });
  });

  it('is a 404 for an attempt id that is not a positive number', async () => {
    await expect(page('abc')).rejects.toThrow('NOT_FOUND');
    await expect(page('0')).rejects.toThrow('NOT_FOUND');
  });
});
