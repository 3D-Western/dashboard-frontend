import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@/api/client/errors';
import { trainingAdminAPI } from '@/api/client/training-admin';
import { trainingAPI } from '@/api/client/training';
import { renderInTraining } from '@test/utils/renderTrainingAdmin';
import { createAdminTraining, createVersionSummary } from '@test/utils/trainingAdminFactories';
import { createPreview } from '@test/utils/trainingPreviewFactories';
import { TrainingPreview } from './TrainingPreview';

vi.mock('@/api/client/training-admin', () => ({
  trainingAdminAPI: { getTraining: vi.fn(), getPreview: vi.fn() },
}));
vi.mock('@/api/client/training', () => ({
  trainingAPI: { getAttempt: vi.fn(), acceptPledge: vi.fn(), getMyTrainings: vi.fn() },
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/admin/training/1/preview/100',
}));

const admin = trainingAdminAPI as unknown as Record<string, Mock>;

const draft = createVersionSummary({ id: 100, versionNo: 2, status: 'DRAFT', stepCount: 4 });
const published = createVersionSummary({ id: 90, versionNo: 1, status: 'PUBLISHED' });
const training = createAdminTraining({ currentVersionId: 90, versions: [draft, published] });

beforeEach(() => {
  admin.getPreview.mockResolvedValue(createPreview());
});

describe('TrainingPreview', () => {
  it('loads the version from the preview endpoint and opens the student player at the pledge', async () => {
    await renderInTraining(<TrainingPreview versionId={100} />, { training });

    expect(await screen.findByText('Preview: nothing is saved')).toBeInTheDocument();
    expect(admin.getPreview).toHaveBeenCalledWith(100);
    expect(screen.getByText(/draft version 2/i)).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Before you begin' })).toBeInTheDocument();
  });

  it('goes back to the draft editor from a draft, and to the training from a published version', async () => {
    const first = await renderInTraining(<TrainingPreview versionId={100} />, { training });
    expect(await screen.findByRole('link', { name: /back to the editor/i })).toHaveAttribute(
      'href',
      '/admin/training/1/draft',
    );
    first.unmount();

    await renderInTraining(<TrainingPreview versionId={90} />, { training });
    expect(await screen.findByRole('link', { name: /back to the editor/i })).toHaveAttribute(
      'href',
      '/admin/training/1',
    );
    expect(screen.getByText(/published version 1/i)).toBeInTheDocument();
  });

  it('walks through without ever calling the learner API', async () => {
    const user = userEvent.setup();
    await renderInTraining(<TrainingPreview versionId={100} />, { training });

    await user.click(await screen.findByRole('button', { name: /i agree, start the training/i }));
    await screen.findByRole('heading', { name: 'Meet the machine' });

    for (const call of Object.values(trainingAPI as unknown as Record<string, Mock>)) {
      expect(call).not.toHaveBeenCalled();
    }
    // Only the one read of the preview, nothing written
    expect(admin.getPreview).toHaveBeenCalledTimes(1);
  });

  it('says what went wrong when the preview cannot be loaded, and can try again', async () => {
    admin.getPreview.mockRejectedValueOnce(
      new ApiError('NOT_FOUND', 'Training version 100 not found'),
    );
    await renderInTraining(<TrainingPreview versionId={100} />, { training });

    const retry = await screen.findByRole('button', { name: /try again/i });
    await userEvent.click(retry);

    expect(await screen.findByText('Preview: nothing is saved')).toBeInTheDocument();
  });
});
