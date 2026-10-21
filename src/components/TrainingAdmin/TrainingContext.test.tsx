import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderInTraining } from '@test/utils/renderTrainingAdmin';
import { createAdminTraining } from '@test/utils/trainingAdminFactories';
import { TrainingAdminRoutes } from '@/lib/training-admin-routes';

vi.mock('@/api/client/training-admin', () => ({
  trainingAdminAPI: { getTraining: vi.fn() },
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/training/1/report',
  useRouter: () => ({ push: vi.fn() }),
}));

describe('TrainingContext section tabs', () => {
  const scrollIntoView = vi.fn();

  beforeEach(() => {
    scrollIntoView.mockClear();
    Element.prototype.scrollIntoView = scrollIntoView;
  });

  it('labels the report tab "Report" and marks the current section', async () => {
    const training = createAdminTraining({ id: 1 });
    await renderInTraining(<p>Section body</p>, { training });

    const report = screen.getByRole('link', { name: 'Report' });
    expect(report).toHaveAttribute('href', TrainingAdminRoutes.report(1));
    expect(report).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByRole('link', { name: 'Question report' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Overview' })).not.toHaveAttribute('aria-current');
  });

  it('brings the current section into view on a narrow screen', async () => {
    await renderInTraining(<p>Section body</p>);

    expect(scrollIntoView).toHaveBeenCalledWith({ inline: 'center', block: 'nearest' });
  });
});
