import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@/api/client/errors';
import { pipelineFarmApi } from '@/api/client/pipeline-farm';
import type { HeldFarmJob, QuarantinedPrinter } from '@/types/pipeline-farm';
import { FarmDesk } from './FarmDesk';

vi.mock('@/api/client/pipeline-farm', () => ({
  pipelineFarmApi: {
    heldJobs: vi.fn(),
    quarantinedPrinters: vi.fn(),
    resolveHeld: vi.fn(),
    clearQuarantine: vi.fn(),
  },
}));

const api = vi.mocked(pipelineFarmApi);
const setup = () => userEvent.setup({ pointerEventsCheck: 0 });
const NOW = new Date('2026-11-04T12:00:00Z');

const heldJobs = (): HeldFarmJob[] => [
  {
    jobId: '22222222-2222-4222-8222-000000000002',
    jobName: 'Gear Housing',
    studentName: 'Priya Nair',
    attemptNo: 1,
    printerId: null,
    pickupTag: 'M3X9',
    needsPerson: 'The farm cannot say what happened to this job.',
    since: '2026-11-04T10:00:00Z',
  },
  {
    jobId: '22222222-2222-4222-8222-000000000001',
    jobName: 'Bracket Mount',
    studentName: 'Sam Rivera',
    attemptNo: 2,
    printerId: 'P07',
    needsPerson: 'No printer is known to be good yet.',
    since: '2026-11-04T06:00:00Z',
  },
];

const printers = (): QuarantinedPrinter[] => [
  {
    printerId: 'P12',
    reason: '3 failed prints in a row; a person must check the printer.',
    consecutiveFailures: 3,
    quarantinedAt: '2026-11-03T16:00:00Z',
  },
];

const ok = { ok: true, message: '' };

beforeEach(() => {
  Object.values(api).forEach((fn) => fn.mockReset());
  api.heldJobs.mockResolvedValue(heldJobs());
  api.quarantinedPrinters.mockResolvedValue(printers());
  api.resolveHeld.mockResolvedValue(ok);
  api.clearQuarantine.mockResolvedValue(ok);
});

const renderDesk = () => render(<FarmDesk now={NOW} refreshMs={0} />);

describe('FarmDesk', () => {
  it('lists held jobs (longest waiting first) and quarantined printers', async () => {
    renderDesk();

    const held = await screen.findAllByTestId('held-job');
    expect(held.map((card) => within(card).getByRole('link').textContent)).toEqual([
      'Bracket Mount',
      'Gear Housing',
    ]);
    expect(within(held[0]).getByText('Attempt 2')).toBeVisible();
    expect(within(held[0]).getByText(/printer P07/)).toBeVisible();
    expect(within(held[0]).getByText('No printer is known to be good yet.')).toBeVisible();
    const printer = screen.getByTestId('quarantined-printer');
    expect(within(printer).getByText('Printer P12')).toBeVisible();
    expect(within(printer).getByText(/3 failures in a row/)).toBeVisible();
    expect(screen.getByText('2 held jobs, 1 quarantined printer.')).toBeVisible();
  });

  it('says plainly when nothing needs a person', async () => {
    api.heldJobs.mockResolvedValue([]);
    api.quarantinedPrinters.mockResolvedValue([]);
    renderDesk();

    expect(await screen.findByText('No job is waiting for a person.')).toBeVisible();
    expect(screen.getByText('Every printer is in rotation.')).toBeVisible();
  });

  it('shows an error with the backend’s words when the farm can’t be loaded', async () => {
    api.heldJobs.mockRejectedValue(new ApiError('FORBIDDEN', 'Staff only'));
    renderDesk();

    expect(await screen.findByText('Staff only')).toBeVisible();
  });

  describe('clearing a quarantine', () => {
    it('needs a reason before anything is sent', async () => {
      renderDesk();
      const user = setup();

      await user.click(await screen.findByRole('button', { name: 'Put back live' }));
      await user.click(screen.getByRole('button', { name: /review and put back live/i }));

      expect(await screen.findByText('A reason is required.')).toBeVisible();
      expect(api.clearQuarantine).not.toHaveBeenCalled();
    });

    it('rejects a reason that is too short', async () => {
      renderDesk();
      const user = setup();

      await user.click(await screen.findByRole('button', { name: 'Put back live' }));
      await user.type(screen.getByRole('textbox', { name: /what was wrong/i }), 'ok');
      await user.click(screen.getByRole('button', { name: /review and put back live/i }));

      expect(await screen.findByText(/at least 3 characters/)).toBeVisible();
      expect(api.clearQuarantine).not.toHaveBeenCalled();
    });

    it('confirms in a second step, then sends the trimmed reason and reloads', async () => {
      renderDesk();
      const user = setup();

      await user.click(await screen.findByRole('button', { name: 'Put back live' }));
      await user.type(
        screen.getByRole('textbox', { name: /what was wrong/i }),
        '  Cleaned the nozzle, test print fine  ',
      );
      await user.click(screen.getByRole('button', { name: /review and put back live/i }));

      const dialog = await screen.findByRole('alertdialog');
      expect(within(dialog).getByText(/Cleaned the nozzle, test print fine/)).toBeVisible();
      expect(api.clearQuarantine).not.toHaveBeenCalled();

      api.quarantinedPrinters.mockResolvedValue([]);
      await user.click(within(dialog).getByRole('button', { name: /yes, put it back live/i }));

      expect(api.clearQuarantine).toHaveBeenCalledWith('P12', {
        cause: 'Cleaned the nozzle, test print fine',
      });
      expect(await screen.findByText(/Printer P12 is back live/)).toBeVisible();
      await waitFor(() => expect(screen.getByText('Every printer is in rotation.')).toBeVisible());
    });

    it('shows the refusal and keeps the printer listed', async () => {
      api.clearQuarantine.mockRejectedValue(
        new ApiError('CONFLICT', 'That printer is not quarantined.'),
      );
      renderDesk();
      const user = setup();

      await user.click(await screen.findByRole('button', { name: 'Put back live' }));
      await user.type(screen.getByRole('textbox', { name: /what was wrong/i }), 'Fixed the belt');
      await user.click(screen.getByRole('button', { name: /review and put back live/i }));
      await user.click(
        within(await screen.findByRole('alertdialog')).getByRole('button', {
          name: /yes, put it back live/i,
        }),
      );

      expect(await screen.findByText('That printer is not quarantined.')).toBeVisible();
      expect(screen.getByTestId('quarantined-printer')).toBeVisible();
    });
  });

  describe('held jobs', () => {
    it('prints again with a reason, no second step needed', async () => {
      renderDesk();
      const user = setup();
      const card = (await screen.findAllByTestId('held-job'))[0];

      await user.click(within(card).getByRole('button', { name: 'Print again' }));
      await user.type(within(card).getByRole('textbox'), 'Bin was just full');
      await user.click(within(card).getByRole('button', { name: 'Print again' }));

      await waitFor(() =>
        expect(api.resolveHeld).toHaveBeenCalledWith('22222222-2222-4222-8222-000000000001', {
          retry: true,
          reason: 'Bin was just full',
        }),
      );
    });

    it('requires a reason to print again too', async () => {
      renderDesk();
      const user = setup();
      const card = (await screen.findAllByTestId('held-job'))[0];

      await user.click(within(card).getByRole('button', { name: 'Print again' }));
      await user.click(within(card).getByRole('button', { name: 'Print again' }));

      expect(await within(card).findByText('A reason is required.')).toBeVisible();
      expect(api.resolveHeld).not.toHaveBeenCalled();
    });

    it('closing is confirmed first, and tells staff the student is told', async () => {
      renderDesk();
      const user = setup();
      const card = (await screen.findAllByTestId('held-job'))[1];

      await user.click(within(card).getByRole('button', { name: 'Close the job' }));
      await user.type(within(card).getByRole('textbox'), 'Lost in the farm, nothing to find');
      await user.click(within(card).getByRole('button', { name: /review and close/i }));

      const dialog = await screen.findByRole('alertdialog');
      expect(within(dialog).getByText(/student is told/i)).toBeVisible();
      expect(api.resolveHeld).not.toHaveBeenCalled();

      await user.click(within(dialog).getByRole('button', { name: /yes, close it/i }));
      expect(api.resolveHeld).toHaveBeenCalledWith('22222222-2222-4222-8222-000000000002', {
        retry: false,
        reason: 'Lost in the farm, nothing to find',
      });
    });

    it('going back from the confirmation sends nothing', async () => {
      renderDesk();
      const user = setup();
      const card = (await screen.findAllByTestId('held-job'))[0];

      await user.click(within(card).getByRole('button', { name: 'Close the job' }));
      await user.type(within(card).getByRole('textbox'), 'Changed my mind later');
      await user.click(within(card).getByRole('button', { name: /review and close/i }));
      await user.click(
        within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Go back' }),
      );

      expect(api.resolveHeld).not.toHaveBeenCalled();
    });
  });
});
