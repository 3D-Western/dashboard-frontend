import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { accessAdminAPI } from '@/api/client/access-admin';
import { createGatekeeper, createLive } from '@test/utils/accessAdminFactories';
import { LIVE_REFRESH_MS, LiveView } from './LiveView';

vi.mock('@/api/client/access-admin', () => ({
  accessAdminAPI: { getLive: vi.fn(), listGatekeepers: vi.fn() },
}));

const api = accessAdminAPI as unknown as Record<string, Mock>;

beforeEach(() => {
  api.getLive.mockResolvedValue(createLive());
  api.listGatekeepers.mockResolvedValue([createGatekeeper()]);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('LiveView', () => {
  it('lists who is checked in and which machines are running', async () => {
    render(<LiveView />);

    const people = await screen.findByRole('region', { name: /in the space now \(2\)/i });
    expect(within(people).getByText('Ada Lovelace')).toBeInTheDocument();
    expect(within(people).getByText(/in for 2 h 5 min/i)).toBeInTheDocument();
    expect(within(people).getByText('Student 251000002')).toBeInTheDocument();
    const machines = screen.getByRole('region', { name: /machines running \(1\)/i });
    expect(within(machines).getByText('Laser 1')).toBeInTheDocument();
    expect(within(machines).getByText(/used by ada lovelace/i)).toBeInTheDocument();
    expect(within(machines).getByText(/running for 45 min/i)).toBeInTheDocument();
  });

  it('says plainly that energy so far is not available, and does not invent a number', async () => {
    render(<LiveView />);

    expect(await screen.findByText(/energy used so far is not shown yet/i)).toBeInTheDocument();
    expect(screen.getByText(/only when the session ends/i)).toBeInTheDocument();
    expect(screen.queryByText(/\bWh\b.*\d|\d+(\.\d+)? ?Wh/)).not.toBeInTheDocument();
  });

  it('says when nobody is in', async () => {
    api.getLive.mockResolvedValue(createLive({ visits: [], sessions: [] }));
    render(<LiveView />);

    expect(await screen.findByText('Nobody is checked in.')).toBeInTheDocument();
    expect(screen.getByText('No machine is running.')).toBeInTheDocument();
  });

  it('refreshes on its own and on request', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<LiveView />);
    await screen.findByRole('region', { name: /in the space now/i });
    expect(api.getLive).toHaveBeenCalledTimes(1);

    api.getLive.mockResolvedValue(createLive({ visits: [], sessions: [] }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(LIVE_REFRESH_MS + 100);
    });

    expect(api.getLive).toHaveBeenCalledTimes(2);
    expect(await screen.findByText('Nobody is checked in.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /refresh/i }));
    expect(api.getLive).toHaveBeenCalledTimes(3);
  });
});
