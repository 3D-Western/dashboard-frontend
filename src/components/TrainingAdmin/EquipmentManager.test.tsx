import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@/api/client/errors';
import { trainingAdminAPI } from '@/api/client/training-admin';
import { createGroup, createMachine } from '@test/utils/trainingAdminFactories';
import { EquipmentManager } from './EquipmentManager';

vi.mock('@/api/client/training-admin', () => ({
  trainingAdminAPI: {
    listGroups: vi.fn(),
    listMachines: vi.fn(),
    createGroup: vi.fn(),
    updateGroup: vi.fn(),
    createMachine: vi.fn(),
    updateMachine: vi.fn(),
  },
}));

const api = trainingAdminAPI as unknown as Record<string, Mock>;

const groups = [
  createGroup({ id: 5, slug: 'laser-cutters', name: 'Laser cutters', description: 'CO2 lasers' }),
  createGroup({ id: 6, slug: 'sewing', name: 'Sewing', active: false, machineCount: 0 }),
];
const machines = [
  createMachine({ id: 9, name: 'Epilog 1', slug: 'epilog-1', equipmentGroupId: 5 }),
  createMachine({
    id: 10,
    name: 'Old Epilog',
    slug: 'epilog-0',
    equipmentGroupId: 5,
    active: false,
    location: null,
  }),
];

beforeEach(() => {
  api.listGroups.mockResolvedValue(groups);
  api.listMachines.mockResolvedValue(machines);
});

async function open() {
  render(<EquipmentManager />);
  await screen.findByRole('heading', { name: /laser cutters/i });
}

describe('EquipmentManager listing', () => {
  it('lists groups with their machines and what is inactive', async () => {
    await open();

    expect(screen.getByText('CO2 lasers')).toBeInTheDocument();
    expect(screen.getByText('Epilog 1')).toBeInTheDocument();
    expect(screen.getByText(/sabourin/i)).toBeInTheDocument();
    expect(screen.getAllByText('Inactive')).toHaveLength(2);
    expect(screen.getByText('No machines in this group yet.')).toBeInTheDocument();
  });

  it('says when there are no groups', async () => {
    api.listGroups.mockResolvedValue([]);
    api.listMachines.mockResolvedValue([]);
    render(<EquipmentManager />);

    expect(await screen.findByText(/no equipment groups yet/i)).toBeInTheDocument();
  });

  it('offers a retry when it cannot load', async () => {
    api.listGroups.mockRejectedValueOnce(new ApiError('REQUEST_FAILED', 'offline'));
    render(<EquipmentManager />);

    expect(await screen.findByText(/reach the server/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));

    expect(await screen.findByRole('heading', { name: /laser cutters/i })).toBeInTheDocument();
  });
});

describe('EquipmentManager groups', () => {
  it('adds a group, making the slug from the name', async () => {
    api.createGroup.mockResolvedValue(createGroup({ id: 7 }));
    await open();

    await userEvent.click(screen.getByRole('button', { name: /add a group/i }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Name' }), 'Power tools');
    expect(within(dialog).getByRole('textbox', { name: /short name/i })).toHaveValue('power-tools');
    await userEvent.type(
      within(dialog).getByRole('textbox', { name: /description/i }),
      'Drills and saws',
    );
    await userEvent.click(within(dialog).getByRole('button', { name: /save group/i }));

    await waitFor(() =>
      expect(api.createGroup).toHaveBeenCalledWith({
        slug: 'power-tools',
        name: 'Power tools',
        description: 'Drills and saws',
        active: true,
      }),
    );
    await waitFor(() => expect(api.listGroups).toHaveBeenCalledTimes(2));
  });

  it('edits a group', async () => {
    api.updateGroup.mockResolvedValue(groups[0]);
    await open();
    const card = screen
      .getByRole('heading', { name: /laser cutters/i })
      .closest('li') as HTMLElement;

    await userEvent.click(within(card).getAllByRole('button', { name: 'Edit' })[0]);
    const dialog = await screen.findByRole('dialog');
    const name = within(dialog).getByRole('textbox', { name: 'Name' });
    await userEvent.clear(name);
    await userEvent.type(name, 'Lasers');
    await userEvent.click(within(dialog).getByRole('button', { name: /save group/i }));

    await waitFor(() =>
      expect(api.updateGroup).toHaveBeenCalledWith(5, {
        slug: 'laser-cutters',
        name: 'Lasers',
        description: 'CO2 lasers',
        active: true,
      }),
    );
  });

  it('deactivates and reactivates a group without losing its other fields', async () => {
    api.updateGroup.mockResolvedValue(groups[0]);
    await open();

    await userEvent.click(screen.getByRole('button', { name: 'Deactivate' }));
    await waitFor(() =>
      expect(api.updateGroup).toHaveBeenCalledWith(
        5,
        expect.objectContaining({ active: false, name: 'Laser cutters' }),
      ),
    );

    await userEvent.click(screen.getByRole('button', { name: 'Reactivate' }));
    await waitFor(() =>
      expect(api.updateGroup).toHaveBeenCalledWith(6, expect.objectContaining({ active: true })),
    );
  });

  it('refuses a bad slug before sending it', async () => {
    await open();
    await userEvent.click(screen.getByRole('button', { name: /add a group/i }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Name' }), 'Lasers');
    const slug = within(dialog).getByRole('textbox', { name: /short name/i });
    await userEvent.clear(slug);
    await userEvent.type(slug, 'Bad_Slug');

    expect(within(dialog).getByRole('button', { name: /save group/i })).toBeDisabled();
  });

  it('shows a taken slug as the server reports it', async () => {
    api.createGroup.mockRejectedValue(
      new ApiError('VALIDATION_FAILED', 'Validation failed', {
        errors: [{ path: 'slug', message: "The slug 'sewing' is already taken" }],
      }),
    );
    await open();
    await userEvent.click(screen.getByRole('button', { name: /add a group/i }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Name' }), 'Sewing');
    await userEvent.click(within(dialog).getByRole('button', { name: /save group/i }));

    expect(
      await within(dialog).findByText("The slug 'sewing' is already taken"),
    ).toBeInTheDocument();
  });
});

describe('EquipmentManager machines', () => {
  it('adds a machine to the group it was started from', async () => {
    api.createMachine.mockResolvedValue(createMachine({ id: 11 }));
    await open();

    await userEvent.click(screen.getByRole('button', { name: /add a machine to laser cutters/i }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByLabelText('Group')).toHaveValue('5');
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Name' }), 'Epilog 2');
    await userEvent.type(within(dialog).getByRole('textbox', { name: /location/i }), 'Sabourin');
    await userEvent.click(within(dialog).getByRole('button', { name: /save machine/i }));

    await waitFor(() =>
      expect(api.createMachine).toHaveBeenCalledWith({
        slug: 'epilog-2',
        name: 'Epilog 2',
        equipmentGroupId: 5,
        location: 'Sabourin',
        active: true,
      }),
    );
  });

  it('moves a machine to another group', async () => {
    api.updateMachine.mockResolvedValue(machines[0]);
    await open();

    await userEvent.click(screen.getByRole('button', { name: 'Edit Epilog 1' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.selectOptions(within(dialog).getByLabelText('Group'), '6');
    await userEvent.click(within(dialog).getByRole('button', { name: /save machine/i }));

    await waitFor(() =>
      expect(api.updateMachine).toHaveBeenCalledWith(
        9,
        expect.objectContaining({ equipmentGroupId: 6, slug: 'epilog-1' }),
      ),
    );
  });

  it('deactivates a machine', async () => {
    api.updateMachine.mockResolvedValue(machines[0]);
    await open();

    await userEvent.click(screen.getByRole('button', { name: 'Deactivate Epilog 1' }));

    await waitFor(() =>
      expect(api.updateMachine).toHaveBeenCalledWith(
        9,
        expect.objectContaining({ active: false, location: 'Sabourin' }),
      ),
    );
  });

  it('says why a change failed', async () => {
    api.updateMachine.mockRejectedValue(new ApiError('CONFLICT', 'That group is inactive'));
    await open();

    await userEvent.click(screen.getByRole('button', { name: 'Reactivate Old Epilog' }));

    expect(await screen.findByText('That group is inactive')).toBeInTheDocument();
  });
});
