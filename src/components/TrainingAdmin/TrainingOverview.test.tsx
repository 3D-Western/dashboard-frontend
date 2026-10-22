import { describe, it, expect, vi, type Mock } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@/api/client/errors';
import { trainingAdminAPI } from '@/api/client/training-admin';
import { renderInTraining } from '@test/utils/renderTrainingAdmin';
import {
  createAdminTraining,
  createVersionDetail,
  createVersionSummary,
} from '@test/utils/trainingAdminFactories';
import { TrainingOverview } from './TrainingOverview';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/admin/training/1',
}));
vi.mock('@/api/client/training-admin', () => ({
  trainingAdminAPI: {
    getTraining: vi.fn(),
    updateTraining: vi.fn(),
    createDraft: vi.fn(),
    discardDraft: vi.fn(),
  },
}));

const api = trainingAdminAPI as unknown as Record<string, Mock>;

const published = createVersionSummary({
  id: 90,
  versionNo: 1,
  status: 'PUBLISHED',
  publishImpact: 'MINOR',
  publishReason: 'First release',
  publishedAt: '2026-09-01T12:00:00Z',
  stepCount: 4,
});
const draft = createVersionSummary({ id: 100, versionNo: 2, status: 'DRAFT', stepCount: 5 });

describe('TrainingOverview versions', () => {
  it('lists every version, newest first, with its impact and reason', async () => {
    await renderInTraining(<TrainingOverview />, {
      training: createAdminTraining({
        currentVersionId: 90,
        versions: [
          published,
          draft,
          createVersionSummary({ id: 80, versionNo: 0, status: 'RETIRED' }),
        ],
      }),
    });

    const versions = within(screen.getByRole('region', { name: 'Versions' })).getAllByRole(
      'listitem',
    );
    expect(versions[0]).toHaveTextContent('Version 2');
    expect(versions[0]).toHaveTextContent('Draft');
    expect(versions[1]).toHaveTextContent('Version 1');
    expect(versions[1]).toHaveTextContent('Published');
    expect(versions[1]).toHaveTextContent('Minor fix');
    expect(versions[1]).toHaveTextContent('Reason: First release');
    expect(versions[2]).toHaveTextContent('Replaced');
  });
});

describe('TrainingOverview preview', () => {
  it('links every version, published ones included, to its preview as a student', async () => {
    await renderInTraining(<TrainingOverview />, {
      training: createAdminTraining({
        currentVersionId: 90,
        versions: [
          published,
          draft,
          createVersionSummary({ id: 80, versionNo: 0, status: 'RETIRED' }),
        ],
      }),
    });

    const links = within(screen.getByRole('region', { name: 'Versions' })).getAllByRole('link', {
      name: /preview as student/i,
    });

    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/admin/training/1/preview/100',
      '/admin/training/1/preview/90',
      '/admin/training/1/preview/80',
    ]);
  });
});

describe('TrainingOverview drafts', () => {
  it('starts a draft from the published version and opens the draft editor', async () => {
    api.createDraft.mockResolvedValue(createVersionDetail([]));
    await renderInTraining(<TrainingOverview />, {
      training: createAdminTraining({ currentVersionId: 90, versions: [published] }),
    });

    await userEvent.click(
      screen.getByRole('button', { name: /start a draft from the published version/i }),
    );

    await waitFor(() => expect(api.createDraft).toHaveBeenCalledWith(1));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/admin/training/1/draft'));
  });

  it('explains how a first draft starts', async () => {
    await renderInTraining(<TrainingOverview />);

    expect(screen.getByText(/nothing is published yet/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^start a draft$/i })).toBeEnabled();
  });

  it('says why a draft could not be started', async () => {
    api.createDraft.mockRejectedValue(
      new ApiError('CONFLICT', 'This training already has a draft'),
    );
    await renderInTraining(<TrainingOverview />);

    await userEvent.click(screen.getByRole('button', { name: /^start a draft$/i }));

    expect(await screen.findByText('This training already has a draft')).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('continues or discards an existing draft, after confirmation', async () => {
    api.discardDraft.mockResolvedValue(null);
    await renderInTraining(<TrainingOverview />, {
      training: createAdminTraining({ currentVersionId: 90, versions: [published, draft] }),
    });

    expect(screen.getByRole('link', { name: /continue the draft/i })).toHaveAttribute(
      'href',
      '/admin/training/1/draft',
    );
    expect(
      screen.getByText(/members still see version 1 until you publish it/i),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /discard draft/i }));
    expect(api.discardDraft).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Discard draft', hidden: false }));

    await waitFor(() => expect(api.discardDraft).toHaveBeenCalledWith(100));
  });

  it('does not start a draft of an archived training', async () => {
    await renderInTraining(<TrainingOverview />, {
      training: createAdminTraining({ archived: true }),
    });

    expect(screen.getByRole('button', { name: /^start a draft$/i })).toBeDisabled();
    expect(screen.getByText(/restore the training to start a draft/i)).toBeInTheDocument();
  });
});

describe('TrainingOverview details', () => {
  it('saves a new title and summary', async () => {
    api.updateTraining.mockImplementation(async (_id: number, body: object) =>
      createAdminTraining(body),
    );
    await renderInTraining(<TrainingOverview />);
    expect(screen.getByRole('button', { name: /save details/i })).toBeDisabled();

    const title = screen.getByRole('textbox', { name: 'Title' });
    await userEvent.clear(title);
    await userEvent.type(title, 'Laser Cutters');
    await userEvent.click(screen.getByRole('button', { name: /save details/i }));

    await waitFor(() =>
      expect(api.updateTraining).toHaveBeenCalledWith(1, {
        title: 'Laser Cutters',
        summary: 'Safe use of the laser cutters.',
      }),
    );
  });

  it('archives and restores a training', async () => {
    api.updateTraining.mockImplementation(async (_id: number, body: { archived: boolean }) =>
      createAdminTraining({ archived: body.archived }),
    );
    await renderInTraining(<TrainingOverview />);

    await userEvent.click(screen.getByRole('button', { name: /archive this training/i }));
    await waitFor(() => expect(api.updateTraining).toHaveBeenCalledWith(1, { archived: true }));

    await userEvent.click(await screen.findByRole('button', { name: /restore this training/i }));
    await waitFor(() => expect(api.updateTraining).toHaveBeenCalledWith(1, { archived: false }));
  });

  it('explains the sign-off of an equipment training and of an orientation', async () => {
    const { unmount } = await renderInTraining(<TrainingOverview />);
    expect(
      screen.getByText(/finish this training with an in-person sign-off/i),
    ).toBeInTheDocument();
    unmount();

    await renderInTraining(<TrainingOverview />, {
      training: createAdminTraining({
        kind: 'ORIENTATION',
        requiresSignoff: false,
        title: 'Welcome',
      }),
    });
    expect(screen.getByText(/fully online; there is no in-person sign-off/i)).toBeInTheDocument();
  });
});
