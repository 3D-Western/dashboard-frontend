import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@/api/client/errors';
import { pipelineFarmApi } from '@/api/client/pipeline-farm';
import type { BedBlock, HeldFarmJob, QuarantinedPrinter } from '@/types/pipeline-farm';
import { FarmDesk } from './FarmDesk';

vi.mock('@/api/client/pipeline-farm', () => ({
  pipelineFarmApi: {
    heldJobs: vi.fn(),
    quarantinedPrinters: vi.fn(),
    bedBlocks: vi.fn(),
    clearBedBlock: vi.fn(),
    bedReference: vi.fn(),
    setBedReference: vi.fn(),
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

const bedBlocks = (): BedBlock[] => [
  {
    printerId: 'P09',
    verdict: 'not_clear',
    code: 'bed.part_left',
    reason: 'Something is on the plate.',
    blockedAt: '2026-11-04T09:00:00Z',
    lastCheckedAt: '2026-11-04T11:30:00Z',
    jobId: '22222222-2222-4222-8222-000000000001',
  },
  {
    printerId: 'P03',
    verdict: 'unsure',
    code: 'bed.dark',
    reason: 'The picture is too dark.',
    blockedAt: '2026-11-04T05:00:00Z',
    lastCheckedAt: '2026-11-04T05:00:00Z',
  },
];

const ok = { ok: true, message: '' };

beforeEach(() => {
  Object.values(api).forEach((fn) => fn.mockReset());
  api.heldJobs.mockResolvedValue(heldJobs());
  api.quarantinedPrinters.mockResolvedValue(printers());
  api.bedBlocks.mockResolvedValue([]);
  api.clearBedBlock.mockResolvedValue(ok);
  api.bedReference.mockResolvedValue(null);
  api.setBedReference.mockResolvedValue(ok);
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

  describe('the empty-bed check (P-106)', () => {
    it('lists the printers held back, longest first, as tasks with the camera’s verdict', async () => {
      api.bedBlocks.mockResolvedValue(bedBlocks());
      renderDesk();

      const cards = await screen.findAllByTestId('bed-block');

      expect(cards.map((card) => within(card).getByText(/^Printer P\d+$/).textContent)).toEqual([
        'Printer P03',
        'Printer P09',
      ]);
      expect(within(cards[0]).getByText('Could not tell')).toBeVisible();
      expect(within(cards[0]).getByText('The picture is too dark.')).toBeVisible();
      expect(within(cards[1]).getByText('Bed not clear')).toBeVisible();
      expect(within(cards[1]).getByRole('link', { name: '22222222' })).toHaveAttribute(
        'href',
        '/admin/review/22222222-2222-4222-8222-000000000001',
      );
      expect(
        screen.getByText('2 held jobs, 1 quarantined printer, 2 beds to check.'),
      ).toBeVisible();
    });

    it('shows no section when nothing is held back', async () => {
      renderDesk();

      await screen.findAllByTestId('held-job');

      expect(screen.queryByRole('heading', { name: 'Beds to check' })).not.toBeInTheDocument();
      expect(screen.getByText('2 held jobs, 1 quarantined printer.')).toBeVisible();
    });

    it('still shows the rest of the desk when the bed check cannot be read', async () => {
      api.bedBlocks.mockRejectedValue(new ApiError('PIPELINE_UNAVAILABLE', 'Not offered'));
      renderDesk();

      expect(await screen.findAllByTestId('held-job')).toHaveLength(2);
      expect(screen.queryByText('Not offered')).not.toBeInTheDocument();
    });

    it('lifts a block only after the person says they looked, with the note they wrote', async () => {
      api.bedBlocks.mockResolvedValue(bedBlocks());
      renderDesk();
      const user = setup();
      const card = (await screen.findAllByTestId('bed-block'))[1];

      await user.click(within(card).getByRole('button', { name: 'Bed is clear…' }));
      expect(api.clearBedBlock).not.toHaveBeenCalled();
      await user.type(
        within(card).getByRole('textbox', { name: /what you saw/i }),
        ' Plate was clean ',
      );
      api.bedBlocks.mockResolvedValue([bedBlocks()[1]]);
      await user.click(within(card).getByRole('button', { name: /yes, i looked/i }));

      await waitFor(() =>
        expect(api.clearBedBlock).toHaveBeenCalledWith('P09', { note: 'Plate was clean' }),
      );
      await waitFor(() => expect(screen.getAllByTestId('bed-block')).toHaveLength(1));
    });

    it('lifts a block without a note too', async () => {
      api.bedBlocks.mockResolvedValue(bedBlocks());
      renderDesk();
      const user = setup();
      const card = (await screen.findAllByTestId('bed-block'))[0];

      await user.click(within(card).getByRole('button', { name: 'Bed is clear…' }));
      await user.click(within(card).getByRole('button', { name: /yes, i looked/i }));

      await waitFor(() => expect(api.clearBedBlock).toHaveBeenCalledWith('P03', {}));
    });

    it('shows the refusal and keeps the printer listed', async () => {
      api.bedBlocks.mockResolvedValue(bedBlocks());
      api.clearBedBlock.mockRejectedValue(new ApiError('CONFLICT', 'That printer has no block.'));
      renderDesk();
      const user = setup();
      const card = (await screen.findAllByTestId('bed-block'))[0];

      await user.click(within(card).getByRole('button', { name: 'Bed is clear…' }));
      await user.click(within(card).getByRole('button', { name: /yes, i looked/i }));

      expect(await screen.findByText('That printer has no block.')).toBeVisible();
      expect(screen.getAllByTestId('bed-block')).toHaveLength(2);
    });

    it('offers the reference tools on a blocked printer and on a quarantined one', async () => {
      api.bedBlocks.mockResolvedValue(bedBlocks());
      renderDesk();

      const block = (await screen.findAllByTestId('bed-block'))[0];
      const quarantined = screen.getByTestId('quarantined-printer');

      for (const card of [block, quarantined]) {
        expect(within(card).getByRole('button', { name: 'Show reference' })).toBeVisible();
        expect(
          within(card).getByRole('button', { name: /save empty-bed reference/i }),
        ).toBeVisible();
      }
    });

    it('saving a reference on a blocked printer reloads the list', async () => {
      api.bedBlocks.mockResolvedValue(bedBlocks());
      renderDesk();
      const user = setup();
      const card = (await screen.findAllByTestId('bed-block'))[1];
      await user.click(within(card).getByRole('button', { name: /save empty-bed reference/i }));
      const dialog = await screen.findByRole('alertdialog');
      api.bedBlocks.mockResolvedValue([bedBlocks()[1]]);

      await user.click(within(dialog).getByRole('checkbox'));
      await user.click(within(dialog).getByRole('button', { name: 'Save the reference' }));

      await waitFor(() =>
        expect(api.setBedReference).toHaveBeenCalledWith('P09', { confirmed: true }),
      );
      await waitFor(() => expect(screen.getAllByTestId('bed-block')).toHaveLength(1));
    });

    it('lets staff look at or save the reference of any printer by its id', async () => {
      renderDesk();
      const user = setup();
      await screen.findAllByTestId('held-job');

      await user.type(screen.getByLabelText('Printer id'), 'P21');
      api.bedReference.mockResolvedValue(new Blob([new Uint8Array([1])], { type: 'image/jpeg' }));
      URL.createObjectURL = vi.fn(() => 'blob:p21');
      URL.revokeObjectURL = vi.fn();
      const tools = screen.getAllByTestId('bed-reference-tools');
      await user.click(
        within(tools[tools.length - 1]).getByRole('button', { name: 'Show reference' }),
      );

      expect(await screen.findByRole('img', { name: /printer P21/i })).toBeVisible();
      expect(api.bedReference).toHaveBeenCalledWith('P21');
    });

    it('refuses an id the backend would not accept', async () => {
      renderDesk();
      const user = setup();
      await screen.findAllByTestId('held-job');

      await user.type(screen.getByLabelText('Printer id'), 'P 21/x');

      expect(await screen.findByText(/letters, digits/i)).toBeVisible();
      expect(screen.getAllByTestId('bed-reference-tools')).toHaveLength(1); // the quarantined printer's only
    });
  });
});
