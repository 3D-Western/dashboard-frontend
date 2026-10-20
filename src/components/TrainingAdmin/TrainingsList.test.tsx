import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@/api/client/errors';
import { trainingAdminAPI } from '@/api/client/training-admin';
import {
  createAdminTraining,
  createGroup,
  createTrainingSummary,
} from '@test/utils/trainingAdminFactories';
import { TrainingsList } from './TrainingsList';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }), usePathname: () => '/' }));
vi.mock('@/api/client/training-admin', () => ({
  trainingAdminAPI: { listTrainings: vi.fn(), listGroups: vi.fn(), createTraining: vi.fn() },
}));

const api = trainingAdminAPI as unknown as Record<string, Mock>;

const trainings = [
  createTrainingSummary({
    id: 2,
    title: 'Laser Cutter',
    currentVersionNo: 3,
    currentVersionId: 30,
    draftVersionId: 31,
  }),
  createTrainingSummary({
    id: 1,
    title: 'Maker Orientation',
    kind: 'ORIENTATION',
    slug: 'maker-orientation',
    currentVersionNo: 1,
    currentVersionId: 10,
  }),
  createTrainingSummary({ id: 3, title: 'Waterjet', slug: 'waterjet', archived: true }),
];

beforeEach(() => {
  api.listTrainings.mockResolvedValue(trainings);
  api.listGroups.mockResolvedValue([
    createGroup({ id: 5, name: 'Laser cutters' }),
    createGroup({ id: 6, name: 'Retired group', active: false }),
  ]);
});

describe('TrainingsList', () => {
  it('shows orientation first, then the rest by name, with their status', async () => {
    render(<TrainingsList />);

    const items = await screen.findAllByRole('listitem');
    expect(items.map((li) => within(li).getByRole('heading').textContent)).toEqual([
      'Maker Orientation',
      'Laser Cutter',
      'Waterjet',
    ]);
    expect(items[0]).toHaveTextContent('Published v1');
    expect(items[1]).toHaveTextContent('Published v3');
    expect(items[1]).toHaveTextContent('Draft in progress');
    expect(items[2]).toHaveTextContent('Nothing published');
    expect(items[2]).toHaveTextContent('Archived');
  });

  it('links to the training and, when there is one, its draft', async () => {
    render(<TrainingsList />);
    const laser = (await screen.findByRole('heading', { name: 'Laser Cutter' })).closest(
      'li',
    ) as HTMLElement;

    expect(within(laser).getByRole('link', { name: 'Open' })).toHaveAttribute(
      'href',
      '/admin/training/2',
    );
    expect(within(laser).getByRole('link', { name: /continue the draft/i })).toHaveAttribute(
      'href',
      '/admin/training/2/draft',
    );
    const orientation = screen
      .getByRole('heading', { name: 'Maker Orientation' })
      .closest('li') as HTMLElement;
    expect(
      within(orientation).queryByRole('link', { name: /continue the draft/i }),
    ).not.toBeInTheDocument();
  });

  it('links to the import page', async () => {
    render(<TrainingsList />);

    expect(await screen.findByRole('link', { name: /import a file/i })).toHaveAttribute(
      'href',
      '/admin/training/import',
    );
  });

  it('says when there are no trainings', async () => {
    api.listTrainings.mockResolvedValue([]);
    render(<TrainingsList />);

    expect(await screen.findByText(/no trainings yet/i)).toBeInTheDocument();
  });
});

describe('TrainingsList creating a training', () => {
  async function openDialog() {
    render(<TrainingsList />);
    await screen.findByRole('heading', { name: 'Laser Cutter' });
    await userEvent.click(screen.getByRole('button', { name: /new training/i }));
    return screen.findByRole('dialog');
  }

  it('creates an equipment training in a group and opens it', async () => {
    api.createTraining.mockResolvedValue(createAdminTraining({ id: 9 }));
    const dialog = await openDialog();

    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Title' }), 'CNC Router');
    expect(within(dialog).getByRole('textbox', { name: /short name/i })).toHaveValue('cnc-router');
    const group = within(dialog).getByLabelText('Equipment group');
    // Only active groups can be chosen
    expect(within(group).queryByRole('option', { name: 'Retired group' })).not.toBeInTheDocument();
    await userEvent.selectOptions(group, '5');
    await userEvent.click(within(dialog).getByRole('button', { name: /create training/i }));

    await waitFor(() =>
      expect(api.createTraining).toHaveBeenCalledWith({
        slug: 'cnc-router',
        title: 'CNC Router',
        summary: null,
        kind: 'EQUIPMENT',
        equipmentGroupId: 5,
      }),
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith('/admin/training/9'));
  });

  it('needs a group for an equipment training but not for an orientation', async () => {
    const dialog = await openDialog();
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Title' }), 'Welcome');
    expect(within(dialog).getByRole('button', { name: /create training/i })).toBeDisabled();

    await userEvent.selectOptions(within(dialog).getByLabelText('Kind'), 'ORIENTATION');

    expect(within(dialog).queryByLabelText('Equipment group')).not.toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /create training/i })).toBeEnabled();
  });

  it('shows a taken slug as the server reports it', async () => {
    api.createTraining.mockRejectedValue(
      new ApiError('VALIDATION_FAILED', 'Validation failed', {
        errors: [{ path: 'slug', message: "A training with the slug 'welcome' already exists" }],
      }),
    );
    const dialog = await openDialog();
    await userEvent.selectOptions(within(dialog).getByLabelText('Kind'), 'ORIENTATION');
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Title' }), 'Welcome');
    await userEvent.click(within(dialog).getByRole('button', { name: /create training/i }));

    expect(
      await within(dialog).findByText("A training with the slug 'welcome' already exists"),
    ).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});
