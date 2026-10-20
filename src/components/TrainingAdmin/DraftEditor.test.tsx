import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@/api/client/errors';
import { trainingAdminAPI } from '@/api/client/training-admin';
import { authorUser, publisherUser, renderInTraining } from '@test/utils/renderTrainingAdmin';
import {
  createAdminStep,
  createAdminTraining,
  createTopic,
  createVersionDetail,
  createVersionSummary,
} from '@test/utils/trainingAdminFactories';
import { DraftEditor } from './DraftEditor';

vi.mock('@/api/client/training-admin', () => ({
  trainingAdminAPI: {
    getTraining: vi.fn(),
    createDraft: vi.fn(),
    getVersion: vi.fn(),
    listTopics: vi.fn(),
    listQuestions: vi.fn(),
    publishCheck: vi.fn(),
    publish: vi.fn(),
    addStep: vi.fn(),
  },
}));

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/admin/training/1/draft',
}));

const api = trainingAdminAPI as unknown as Record<string, Mock>;

const draftSummary = createVersionSummary({ id: 100, versionNo: 2, status: 'DRAFT', stepCount: 2 });
const withDraft = (overrides = {}) =>
  createAdminTraining({
    currentVersionId: 90,
    versions: [draftSummary, createVersionSummary({ id: 90, versionNo: 1, status: 'PUBLISHED' })],
    ...overrides,
  });

const steps = [
  createAdminStep({ id: 11, position: 1, type: 'VIDEO', title: 'Meet the machine' }),
  createAdminStep({ id: 12, position: 2, type: 'READING', title: 'Safe operation' }),
];

beforeEach(() => {
  api.getVersion.mockResolvedValue(createVersionDetail(steps, { version: draftSummary }));
  api.listTopics.mockResolvedValue([createTopic()]);
  api.listQuestions.mockResolvedValue([]);
});

describe('DraftEditor without a draft', () => {
  it('offers to start one', async () => {
    api.createDraft.mockResolvedValue(createVersionDetail([]));
    await renderInTraining(<DraftEditor />, { training: createAdminTraining() });

    expect(screen.getByText(/there is no draft of this training/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /start a draft/i }));

    await waitFor(() => expect(api.createDraft).toHaveBeenCalledWith(1));
    // The training is loaded again to pick up the new draft.
    await waitFor(() => expect(api.getTraining).toHaveBeenCalledTimes(2));
  });

  it('says why a draft could not be started', async () => {
    api.createDraft.mockRejectedValue(new ApiError('CONFLICT', 'A draft already exists'));
    await renderInTraining(<DraftEditor />, { training: createAdminTraining() });

    await userEvent.click(screen.getByRole('button', { name: /start a draft/i }));

    expect(await screen.findByText('A draft already exists')).toBeInTheDocument();
  });
});

describe('DraftEditor', () => {
  it('shows the draft’s steps, the add buttons and the sign-off checklist of a machine training', async () => {
    await renderInTraining(<DraftEditor />, { training: withDraft() });

    expect(await screen.findByText('Draft version 2')).toBeInTheDocument();
    expect(screen.getByRole('listitem', { name: /step 1: meet the machine/i })).toBeInTheDocument();
    expect(screen.getByRole('listitem', { name: /step 2: safe operation/i })).toBeInTheDocument();
    for (const type of ['Video', 'Reading', 'Quiz', 'Attestation']) {
      expect(screen.getByRole('button', { name: new RegExp(`^${type}$`) })).toBeInTheDocument();
    }
    expect(
      screen.getByRole('region', { name: /in-person sign-off checklist/i }),
    ).toBeInTheDocument();
  });

  it('has no checklist for an orientation, which is fully online', async () => {
    await renderInTraining(<DraftEditor />, {
      training: withDraft({ kind: 'ORIENTATION', requiresSignoff: false, equipmentGroupId: null }),
    });

    await screen.findByText('Draft version 2');
    expect(screen.queryByText(/in-person sign-off checklist/i)).not.toBeInTheDocument();
  });

  it('adds a step through the dialog and reloads the draft', async () => {
    api.addStep.mockResolvedValue(createAdminStep({ id: 13, type: 'ATTESTATION' }));
    await renderInTraining(<DraftEditor />, { training: withDraft() });
    await screen.findByText('Draft version 2');

    await userEvent.click(screen.getByRole('button', { name: /^attestation$/i }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Title' }), 'Understood');
    await userEvent.click(within(dialog).getByRole('button', { name: /^add step$/i }));

    await waitFor(() =>
      expect(api.addStep).toHaveBeenCalledWith(
        100,
        expect.objectContaining({ type: 'ATTESTATION' }),
      ),
    );
    await waitFor(() => expect(api.getVersion).toHaveBeenCalledTimes(2));
  });

  it('opens an existing step for editing', async () => {
    await renderInTraining(<DraftEditor />, { training: withDraft() });
    await screen.findByText('Draft version 2');

    await userEvent.click(screen.getByRole('button', { name: 'Edit step 2' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('textbox', { name: 'Title' })).toHaveValue('Safe operation');
  });
});

describe('DraftEditor publish check', () => {
  it('puts each problem under the step it is about and lists the rest at the top', async () => {
    api.publishCheck.mockResolvedValue({
      ready: false,
      issues: [
        { path: 'steps[1] "Meet the machine"', message: 'The video has no uploaded file yet' },
        { path: 'steps', message: 'A training needs a quiz step' },
        { path: 'signoffChecklist', message: 'Add the in-person checklist' },
      ],
    });
    await renderInTraining(<DraftEditor />, { training: withDraft() });
    await screen.findByText('Draft version 2');

    await userEvent.click(screen.getByRole('button', { name: /check before publishing/i }));

    expect(api.publishCheck).toHaveBeenCalledWith(100, 'MINOR');
    const first = await screen.findByRole('listitem', { name: /step 1/i });
    expect(within(first).getByText('The video has no uploaded file yet')).toBeInTheDocument();
    expect(screen.getByText('Not ready to publish')).toBeInTheDocument();
    expect(screen.getByText(/needs a quiz step/)).toBeInTheDocument();
    expect(screen.getByText(/add the in-person checklist/i)).toBeInTheDocument();
  });

  it('says when the draft is ready', async () => {
    api.publishCheck.mockResolvedValue({ ready: true, issues: [] });
    await renderInTraining(<DraftEditor />, { training: withDraft() });
    await screen.findByText('Draft version 2');

    await userEvent.click(screen.getByRole('button', { name: /check before publishing/i }));

    expect(await screen.findByText(/found nothing missing/i)).toBeInTheDocument();
  });
});

describe('DraftEditor publishing and permissions', () => {
  it('lets someone who can publish open the publish dialog', async () => {
    api.publishCheck.mockResolvedValue({ ready: true, issues: [] });
    await renderInTraining(<DraftEditor />, { training: withDraft(), user: publisherUser() });
    await screen.findByText('Draft version 2');

    await userEvent.click(screen.getByRole('button', { name: /publish\.\.\./i }));

    expect(await screen.findByRole('dialog', { name: /publish this draft/i })).toBeInTheDocument();
  });

  it('hides publishing from someone who can only author, and says so', async () => {
    await renderInTraining(<DraftEditor />, { training: withDraft(), user: authorUser() });
    await screen.findByText('Draft version 2');

    expect(screen.queryByRole('button', { name: /publish\.\.\./i })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /check before publishing/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/publishing needs the .*publish trainings.* permission/i),
    ).toBeInTheDocument();
    // Editing is still there
    expect(screen.getByRole('button', { name: 'Edit step 1' })).toBeInTheDocument();
  });

  it('goes back to the training once the published dialog is closed', async () => {
    api.publishCheck.mockResolvedValue({ ready: true, issues: [] });
    api.publish.mockResolvedValue({
      version: createVersionSummary({ versionNo: 2, status: 'PUBLISHED' }),
      retiredVersionId: 90,
      poolSize: 4,
      effects: { addonRequired: 0, lapsed: 0, addonDueAt: null },
    });
    await renderInTraining(<DraftEditor />, { training: withDraft(), user: publisherUser() });
    await screen.findByText('Draft version 2');
    await userEvent.click(screen.getByRole('button', { name: /publish\.\.\./i }));
    await screen.findByText(/ready to publish/i);
    await userEvent.type(screen.getByLabelText(/why are you publishing/i), 'Typo fix');
    await userEvent.click(screen.getByRole('button', { name: /^publish \(/i }));

    await userEvent.click(await screen.findByRole('button', { name: 'Done' }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/admin/training/1'));
  });
});
