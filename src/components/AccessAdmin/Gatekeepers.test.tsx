import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@/api/client/errors';
import { accessAdminAPI } from '@/api/client/access-admin';
import { copyToClipboard } from '@/lib/clipboard';
import { createGatekeeper } from '@test/utils/accessAdminFactories';
import { Gatekeepers } from './Gatekeepers';

vi.mock('@/api/client/access-admin', () => ({
  accessAdminAPI: {
    listGatekeepers: vi.fn(),
    registerGatekeeper: vi.fn(),
    updateGatekeeper: vi.fn(),
    rotateGatekeeperToken: vi.fn(),
  },
}));
vi.mock('@/lib/clipboard', () => ({ copyToClipboard: vi.fn() }));

const api = accessAdminAPI as unknown as Record<string, Mock>;
const TOKEN = 'gk_abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG';

beforeEach(() => {
  api.listGatekeepers.mockResolvedValue([createGatekeeper()]);
  (copyToClipboard as Mock).mockResolvedValue(undefined);
});

async function open() {
  render(<Gatekeepers />);
  await screen.findByRole('heading', { name: /makerspace pc/i });
}

describe('Gatekeepers listing', () => {
  it('shows status, last health report and last sync', async () => {
    await open();

    expect(screen.getByText('Online')).toBeInTheDocument();
    expect(screen.getByText(/last heard from 2 min ago/i)).toBeInTheDocument();
    const health = screen.getByRole('region', { name: /last health report of makerspace pc/i });
    expect(within(health).getByText('0.1.0')).toBeInTheDocument();
    expect(within(health).getByText('4 min ago')).toBeInTheDocument(); // last sync
    expect(within(health).getByText('3 events')).toBeInTheDocument();
    expect(within(health).getByText('Connected')).toBeInTheDocument();
    expect(within(health).getByText('plug laser-1-plug: timeout')).toBeInTheDocument();
  });

  it('says plainly when no health report has arrived', async () => {
    api.listGatekeepers.mockResolvedValue([
      createGatekeeper({ health: null, healthReportedAt: null, lastSeenAt: null }),
    ]);
    await open();

    expect(screen.getByText('Never connected')).toBeInTheDocument();
    expect(screen.getByText(/no health report yet/i)).toBeInTheDocument();
  });

  it('says when nothing is registered', async () => {
    api.listGatekeepers.mockResolvedValue([]);
    render(<Gatekeepers />);

    expect(await screen.findByText(/no gatekeeper is registered yet/i)).toBeInTheDocument();
  });

  it('offers a retry when it cannot load', async () => {
    api.listGatekeepers.mockRejectedValueOnce(new ApiError('REQUEST_FAILED', 'offline'));
    render(<Gatekeepers />);

    expect(await screen.findByText(/reach the server/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));

    expect(await screen.findByRole('heading', { name: /makerspace pc/i })).toBeInTheDocument();
  });
});

describe('Gatekeepers registering', () => {
  it('registers a gatekeeper and shows its token once, with a copy button', async () => {
    api.registerGatekeeper.mockResolvedValue({
      gatekeeper: createGatekeeper({ id: 2, name: 'Spare PC' }),
      token: TOKEN,
    });
    await open();

    await userEvent.click(screen.getByRole('button', { name: /register a gatekeeper/i }));
    const form = await screen.findByRole('dialog');
    await userEvent.type(within(form).getByRole('textbox', { name: 'Name' }), 'Spare PC');
    await userEvent.click(within(form).getByRole('button', { name: /register gatekeeper/i }));

    expect(api.registerGatekeeper).toHaveBeenCalledWith({
      name: 'Spare PC',
      pollIntervalSeconds: 30,
      nightlyResetTime: '03:00',
      tapDebounceSeconds: 3,
      reconcileMinutes: 60,
    });
    const secret = await screen.findByRole('dialog', { name: /gatekeeper registered/i });
    expect(within(secret).getByLabelText('Gatekeeper token')).toHaveValue(TOKEN);
    expect(within(secret).getByText(/only time you will see it/i)).toBeInTheDocument();

    await userEvent.click(within(secret).getByRole('button', { name: /copy/i }));
    expect(copyToClipboard).toHaveBeenCalledWith(TOKEN);
    expect(await within(secret).findByText('Copied')).toBeInTheDocument();
  });

  it('cannot be dismissed by Escape, and the token is gone once it is saved', async () => {
    api.registerGatekeeper.mockResolvedValue({
      gatekeeper: createGatekeeper({ id: 2, name: 'Spare PC' }),
      token: TOKEN,
    });
    await open();
    await userEvent.click(screen.getByRole('button', { name: /register a gatekeeper/i }));
    const form = await screen.findByRole('dialog');
    await userEvent.type(within(form).getByRole('textbox', { name: 'Name' }), 'Spare PC');
    await userEvent.click(within(form).getByRole('button', { name: /register gatekeeper/i }));
    await screen.findByLabelText('Gatekeeper token');

    await userEvent.keyboard('{Escape}');
    expect(screen.getByLabelText('Gatekeeper token')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /i have saved it/i }));

    await waitFor(() =>
      expect(screen.queryByLabelText('Gatekeeper token')).not.toBeInTheDocument(),
    );
    expect(screen.queryByText(TOKEN)).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(TOKEN);
    // The list that is shown afterwards never carries a token: it comes from the list call.
    expect(api.listGatekeepers).toHaveBeenCalledTimes(2);
  });

  it('checks the form before asking the server, and shows what is wrong', async () => {
    await open();
    await userEvent.click(screen.getByRole('button', { name: /register a gatekeeper/i }));
    const form = await screen.findByRole('dialog');
    await userEvent.clear(within(form).getByRole('textbox', { name: /check for changes every/i }));
    await userEvent.type(
      within(form).getByRole('textbox', { name: /check for changes every/i }),
      '2',
    );
    await userEvent.click(within(form).getByRole('button', { name: /register gatekeeper/i }));

    expect(within(form).getByText(/give the gatekeeper a name/i)).toBeInTheDocument();
    expect(within(form).getByText(/from 5 to 3600/i)).toBeInTheDocument();
    expect(api.registerGatekeeper).not.toHaveBeenCalled();
  });

  it('shows the server’s message when the name is taken', async () => {
    api.registerGatekeeper.mockRejectedValue(
      new ApiError('NAME_TAKEN', "A gatekeeper called 'Spare PC' already exists."),
    );
    await open();
    await userEvent.click(screen.getByRole('button', { name: /register a gatekeeper/i }));
    const form = await screen.findByRole('dialog');
    await userEvent.type(within(form).getByRole('textbox', { name: 'Name' }), 'Spare PC');
    await userEvent.click(within(form).getByRole('button', { name: /register gatekeeper/i }));

    expect(await within(form).findByText(/already exists/i)).toBeInTheDocument();
    expect(screen.queryByLabelText('Gatekeeper token')).not.toBeInTheDocument();
  });
});

describe('Gatekeepers editing and rotating', () => {
  it('saves changed settings and clears the offline limit with 0', async () => {
    api.listGatekeepers.mockResolvedValue([createGatekeeper({ maxOfflineTrustHours: 24 })]);
    api.updateGatekeeper.mockResolvedValue(createGatekeeper());
    await open();

    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const form = await screen.findByRole('dialog');
    await userEvent.clear(within(form).getByRole('textbox', { name: /stop trusting its copy/i }));
    await userEvent.click(within(form).getByRole('button', { name: /save gatekeeper/i }));

    await waitFor(() =>
      expect(api.updateGatekeeper).toHaveBeenCalledWith(1, {
        name: 'Makerspace PC',
        pollIntervalSeconds: 30,
        maxOfflineTrustHours: 0,
        nightlyResetTime: '03:00',
        tapDebounceSeconds: 3,
        reconcileMinutes: 60,
        active: true,
      }),
    );
  });

  it('asks before rotating, then shows the new token once', async () => {
    api.rotateGatekeeperToken.mockResolvedValue({ gatekeeper: createGatekeeper(), token: TOKEN });
    await open();

    await userEvent.click(screen.getByRole('button', { name: /rotate token for makerspace pc/i }));
    const confirm = await screen.findByRole('alertdialog');
    expect(
      within(confirm).getByText(/current token stops working immediately/i),
    ).toBeInTheDocument();
    expect(api.rotateGatekeeperToken).not.toHaveBeenCalled();

    await userEvent.click(within(confirm).getByRole('button', { name: /rotate token/i }));

    expect(api.rotateGatekeeperToken).toHaveBeenCalledWith(1);
    const secret = await screen.findByRole('dialog', { name: /new token for makerspace pc/i });
    expect(within(secret).getByLabelText('Gatekeeper token')).toHaveValue(TOKEN);
    await userEvent.click(within(secret).getByRole('button', { name: /i have saved it/i }));
    await waitFor(() => expect(document.body).not.toHaveTextContent(TOKEN));
  });

  it('does not rotate when the admin backs out', async () => {
    await open();

    await userEvent.click(screen.getByRole('button', { name: /rotate token for makerspace pc/i }));
    await userEvent.click(await screen.findByRole('button', { name: /keep the current token/i }));

    expect(api.rotateGatekeeperToken).not.toHaveBeenCalled();
  });
});
