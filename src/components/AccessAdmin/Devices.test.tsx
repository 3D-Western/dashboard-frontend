import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { accessAdminAPI } from '@/api/client/access-admin';
import { createDevice, createGatekeeper, createMachine } from '@test/utils/accessAdminFactories';
import { Devices } from './Devices';

vi.mock('@/api/client/access-admin', () => ({
  accessAdminAPI: {
    listDevices: vi.fn(),
    listMachines: vi.fn(),
    listGatekeepers: vi.fn(),
    registerDevice: vi.fn(),
    updateDevice: vi.fn(),
    rotateDeviceKey: vi.fn(),
  },
}));
vi.mock('@/lib/clipboard', () => ({ copyToClipboard: vi.fn() }));

const api = accessAdminAPI as unknown as Record<string, Mock>;
const KEY = 'dk_abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG';

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

const station = createDevice();
const plug = createDevice({
  id: 11,
  deviceKey: 'laser-1-plug',
  kind: 'PLUG',
  name: 'Laser 1 plug',
  lockMethod: null,
  idlePowerWatts: null,
  idleMinutes: null,
  networkAddress: '192.168.1.50',
  lastHeartbeatAt: minutesAgo(40),
});
const kiosk = createDevice({
  id: 12,
  deviceKey: 'kiosk-1',
  kind: 'KIOSK',
  name: 'Entrance kiosk',
  machineId: null,
  machineName: null,
  lockMethod: null,
  idlePowerWatts: null,
  idleMinutes: null,
  healthStatus: 'OFFLINE',
});

beforeEach(() => {
  api.listDevices.mockResolvedValue([station, plug, kiosk]);
  api.listMachines.mockResolvedValue([
    createMachine(),
    createMachine({ id: 6, name: 'Laser 2', slug: 'laser-2' }),
  ]);
  api.listGatekeepers.mockResolvedValue([createGatekeeper()]);
});

async function open() {
  render(<Devices />);
  await screen.findByRole('heading', { name: /entrance kiosk/i });
}

describe('Devices listing', () => {
  it('groups devices by machine and shows kind, status and last heartbeat', async () => {
    await open();

    const laser = screen.getByRole('region', { name: 'Laser 1' });
    expect(
      within(laser).getByRole('heading', { name: /laser 1 card reader/i }),
    ).toBeInTheDocument();
    expect(within(laser).getByRole('heading', { name: /laser 1 plug/i })).toBeInTheDocument();
    expect(within(laser).getByText('Online')).toBeInTheDocument();
    expect(within(laser).getByText('No recent heartbeat')).toBeInTheDocument(); // the plug, 40 min quiet
    expect(within(laser).getByText('1 min ago')).toBeInTheDocument();
    const kiosks = screen.getByRole('region', { name: 'Kiosks' });
    expect(within(kiosks).getByText('Offline')).toBeInTheDocument();
  });

  it('shows the machine settings on the card reader and the address on the plug', async () => {
    await open();

    const laser = screen.getByRole('region', { name: 'Laser 1' });
    expect(within(laser).getByText('Counts as off under 12.5 W for 15 min')).toBeInTheDocument();
    expect(within(laser).getByText('Smart plug (power on and off)')).toBeInTheDocument();
    expect(within(laser).getByText('No maximum')).toBeInTheDocument();
    expect(within(laser).getByText('Required')).toBeInTheDocument();
    expect(within(laser).getByText('192.168.1.50')).toBeInTheDocument();
  });

  it('lists machines that have no card reader yet, with a shortcut to add one', async () => {
    await open();

    const bare = screen.getByRole('region', { name: /machines without devices/i });
    expect(within(bare).getByText('Laser 2')).toBeInTheDocument();
    await userEvent.click(
      within(bare).getByRole('button', { name: /add a card reader to laser 2/i }),
    );

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('combobox', { name: 'Type' })).toHaveValue('STATION');
    expect(within(dialog).getByRole('combobox', { name: 'Machine' })).toHaveValue('6');
  });

  it('filters by gatekeeper when there is more than one', async () => {
    api.listGatekeepers.mockResolvedValue([
      createGatekeeper(),
      createGatekeeper({ id: 2, name: 'Annex PC' }),
    ]);
    api.listDevices.mockResolvedValue([station, { ...kiosk, gatekeeperId: 2 }]);
    await open();

    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: /show devices of/i }),
      'Annex PC',
    );

    expect(screen.getByRole('heading', { name: /entrance kiosk/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /laser 1 card reader/i })).not.toBeInTheDocument();
  });
});

describe('Devices adding', () => {
  async function openAddDialog() {
    await open();
    await userEvent.click(screen.getByRole('button', { name: /add a device/i }));
    return screen.findByRole('dialog');
  }

  it('explains the idle rule in plain words and hides it for other lock methods', async () => {
    const dialog = await openAddDialog();

    expect(
      within(dialog).getByText(/counts as off when it draws under this power level for this long/i),
    ).toBeInTheDocument();
    expect(within(dialog).getByText(/set it generously for laser cutters/i)).toBeInTheDocument();

    await userEvent.selectOptions(
      within(dialog).getByRole('combobox', { name: /how the machine is locked/i }),
      'RELAY',
    );

    expect(within(dialog).queryByText(/idle power level/i)).not.toBeInTheDocument();
  });

  it('keeps the session limit off by default and says it never cuts a running machine', async () => {
    const dialog = await openAddDialog();

    const limit = within(dialog).getByRole('checkbox', {
      name: /limit how long one session can last/i,
    });
    expect(limit).not.toBeChecked();
    expect(within(dialog).getByText(/never cuts a running machine/i)).toBeInTheDocument();
    expect(
      within(dialog).queryByRole('textbox', { name: /longest session/i }),
    ).not.toBeInTheDocument();

    await userEvent.click(limit);
    expect(within(dialog).getByRole('textbox', { name: /longest session/i })).toBeInTheDocument();
  });

  it('checks the form before asking the server', async () => {
    const dialog = await openAddDialog();
    await userEvent.selectOptions(within(dialog).getByRole('combobox', { name: 'Gatekeeper' }), '');

    await userEvent.click(within(dialog).getByRole('button', { name: /add device/i }));

    expect(within(dialog).getByText(/give the device a name/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/choose the machine/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/choose the gatekeeper/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/enter the power level in watts/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/enter a whole number of minutes/i)).toBeInTheDocument();
    expect(api.registerDevice).not.toHaveBeenCalled();
  });

  it('does not offer a machine that already has that kind of device', async () => {
    const dialog = await openAddDialog();

    expect(
      within(dialog).getByRole('option', { name: /laser 1 \(already has a card reader\)/i }),
    ).toBeDisabled();
    expect(within(dialog).getByRole('option', { name: 'Laser 2' })).toBeEnabled();
  });

  it('adds a card reader for a laser with generous idle settings, then shows its key once', async () => {
    api.registerDevice.mockResolvedValue({
      device: createDevice({ id: 20, name: 'Laser 2 card reader' }),
      key: KEY,
    });
    const dialog = await openAddDialog();

    await userEvent.selectOptions(within(dialog).getByRole('combobox', { name: 'Machine' }), '6');
    await userEvent.type(
      within(dialog).getByRole('textbox', { name: 'Name' }),
      'Laser 2 card reader',
    );
    expect(within(dialog).getByRole('textbox', { name: 'Device ID' })).toHaveValue(
      'laser-2-card-reader',
    );
    await userEvent.type(within(dialog).getByRole('textbox', { name: /idle power level/i }), '8');
    await userEvent.type(within(dialog).getByRole('textbox', { name: /idle time/i }), '20');
    await userEvent.click(within(dialog).getByRole('button', { name: /add device/i }));

    await waitFor(() =>
      expect(api.registerDevice).toHaveBeenCalledWith({
        deviceKey: 'laser-2-card-reader',
        kind: 'STATION',
        name: 'Laser 2 card reader',
        gatekeeperId: 1,
        machineId: 6,
        checkInRequired: true,
        lockMethod: 'PLUG',
        idlePowerWatts: 8,
        idleMinutes: 20,
      }),
    );
    const secret = await screen.findByRole('dialog', { name: /key for laser 2 card reader/i });
    expect(within(secret).getByLabelText('Device key')).toHaveValue(KEY);

    await userEvent.click(within(secret).getByRole('button', { name: /i have saved it/i }));
    await waitFor(() => expect(document.body).not.toHaveTextContent(KEY));
  });

  it('adds a plug with its address and shows no key', async () => {
    api.registerDevice.mockResolvedValue({
      device: createDevice({ id: 21, kind: 'PLUG' }),
      key: null,
    });
    const dialog = await openAddDialog();

    await userEvent.selectOptions(within(dialog).getByRole('combobox', { name: 'Type' }), 'PLUG');
    await userEvent.selectOptions(within(dialog).getByRole('combobox', { name: 'Machine' }), '6');
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Name' }), 'Laser 2 plug');
    await userEvent.type(
      within(dialog).getByRole('textbox', { name: 'Plug address' }),
      '192.168.1.51',
    );
    await userEvent.click(within(dialog).getByRole('button', { name: /add device/i }));

    await waitFor(() =>
      expect(api.registerDevice).toHaveBeenCalledWith({
        deviceKey: 'laser-2-plug',
        kind: 'PLUG',
        name: 'Laser 2 plug',
        gatekeeperId: 1,
        machineId: 6,
        networkAddress: '192.168.1.51',
      }),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.queryByLabelText('Device key')).not.toBeInTheDocument();
  });
});

describe('Devices editing and rotating keys', () => {
  it('edits a card reader: turning on a session limit sends it', async () => {
    api.updateDevice.mockResolvedValue(station);
    await open();

    await userEvent.click(screen.getByRole('button', { name: 'Edit Laser 1 card reader' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(
      within(dialog).getByRole('checkbox', { name: /limit how long one session/i }),
    );
    await userEvent.type(within(dialog).getByRole('textbox', { name: /longest session/i }), '600');
    await userEvent.click(within(dialog).getByRole('button', { name: /save device/i }));

    await waitFor(() =>
      expect(api.updateDevice).toHaveBeenCalledWith(
        10,
        expect.objectContaining({
          maxSessionMinutes: 600,
          idleMinutes: 15,
          idlePowerWatts: 12.5,
          gatekeeperId: 1,
        }),
      ),
    );
  });

  it('has no rotate button for a plug, and asks before rotating a key', async () => {
    api.rotateDeviceKey.mockResolvedValue({ device: station, key: KEY });
    await open();

    expect(
      screen.queryByRole('button', { name: /rotate key for laser 1 plug/i }),
    ).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: /rotate key for laser 1 card reader/i }),
    );
    const confirm = await screen.findByRole('alertdialog');
    expect(api.rotateDeviceKey).not.toHaveBeenCalled();

    await userEvent.click(within(confirm).getByRole('button', { name: /rotate key/i }));

    const secret = await screen.findByRole('dialog', { name: /new key for laser 1 card reader/i });
    expect(within(secret).getByLabelText('Device key')).toHaveValue(KEY);
  });
});
