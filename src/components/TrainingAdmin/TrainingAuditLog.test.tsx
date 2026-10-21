import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { trainingAdminAPI } from '@/api/client/training-admin';
import type { PaginatedResponse } from '@/types/common';
import type { TrainingAuditEntry } from '@/types/training-audit';
import { createTrainingSummary } from '@test/utils/trainingAdminFactories';
import { TrainingAuditLog } from './TrainingAuditLog';

vi.mock('@/api/client/training-admin', () => ({
  trainingAdminAPI: { listTrainings: vi.fn(), listAuditLog: vi.fn() },
}));

const api = trainingAdminAPI as unknown as Record<string, Mock>;

const entry = (overrides: Partial<TrainingAuditEntry> = {}): TrainingAuditEntry => ({
  id: 1,
  createdAt: '2026-10-20T15:04:00Z',
  actor: { studentId: 900000001, firstName: 'Sam', lastName: 'Lee' },
  actorType: 'STAFF',
  action: 'TRAINING_SETTING_CHANGED',
  entityType: 'TRAINING',
  entityId: '3',
  trainingId: 3,
  summary: 'Changed pass mark from 90% to 85%',
  details: { setting: 'passMarkPercent', before: 90, after: 85 },
  ...overrides,
});

const SNAPSHOT = '2026-10-20T16:00:00Z';

const page = (
  data: TrainingAuditEntry[],
  options: { hasNext?: boolean; page?: number } = {},
): PaginatedResponse<TrainingAuditEntry> => {
  const current = options.page ?? 1;
  return {
    data,
    pagination: {
      page: current,
      pageSize: 50,
      totalItems: data.length,
      totalPages: options.hasNext ? current + 1 : current,
      hasNext: options.hasNext ?? false,
      hasPrevious: current > 1,
      snapshotCreatedBefore: SNAPSHOT,
    },
  };
};

beforeEach(() => {
  api.listTrainings.mockReset();
  api.listAuditLog.mockReset();
  api.listTrainings.mockResolvedValue([createTrainingSummary({ id: 3, title: 'Laser Cutter' })]);
  api.listAuditLog.mockResolvedValue(page([entry()]));
});

describe('TrainingAuditLog', () => {
  it('lists the newest change first, with who, when, what and the summary', async () => {
    api.listAuditLog.mockResolvedValue(
      page([
        entry({
          id: 2,
          createdAt: '2026-10-20T16:00:00Z',
          action: 'STEP_ADDED',
          summary: 'Added step 2 "Final quiz" (quiz) to draft version 3',
        }),
        entry({ id: 1, createdAt: '2026-10-19T09:30:00Z' }),
      ]),
    );

    render(<TrainingAuditLog />);

    const items = await screen.findAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Added step 2');
    expect(items[0]).toHaveTextContent('Sam Lee');
    expect(items[0]).toHaveTextContent('Step added');
    expect(items[0]).toHaveTextContent('Laser Cutter');
    expect(items[0].querySelector('time')).toHaveAttribute('datetime', '2026-10-20T16:00:00Z');
    expect(items[1]).toHaveTextContent('Changed pass mark from 90% to 85%');
  });

  it('keeps the before and after values closed until someone opens them', async () => {
    const user = userEvent.setup();
    render(<TrainingAuditLog />);

    const toggle = await screen.findByText('Show details');
    const details = toggle.closest('details');
    expect(details).not.toHaveAttribute('open');

    await user.click(toggle);

    expect(details).toHaveAttribute('open');
    expect(details).toHaveTextContent('"before": 90');
    expect(details).toHaveTextContent('"after": 85');
  });

  it('names the system for an automatic change and the supervisor for a Teams approval', async () => {
    api.listAuditLog.mockResolvedValue(
      page([
        entry({ id: 2, actor: null, actorType: 'SYSTEM', summary: 'Automatic change' }),
        entry({
          id: 1,
          actorType: 'INTEGRATION',
          action: 'SIGNOFF_APPROVED',
          summary: 'Approved the in-person sign-off',
          details: null,
        }),
      ]),
    );

    render(<TrainingAuditLog />);

    const items = await screen.findAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Automatic (nobody signed in)');
    expect(items[1]).toHaveTextContent('Sam Lee (through Teams)');
    expect(within(items[1]).queryByText('Show details')).not.toBeInTheDocument();
  });

  it('sends the filters to the server and leaves out a student number that is not digits', async () => {
    const user = userEvent.setup();
    render(<TrainingAuditLog />);
    await screen.findAllByRole('listitem');

    await user.selectOptions(screen.getByLabelText('Training'), '3');
    await waitFor(() =>
      expect(api.listAuditLog).toHaveBeenLastCalledWith(
        expect.objectContaining({ trainingId: 3, pageSize: 50 }),
      ),
    );

    await user.selectOptions(screen.getByLabelText('Change'), 'STEP_ADDED');
    expect(api.listAuditLog).toHaveBeenLastCalledWith(
      expect.objectContaining({ trainingId: 3, action: 'STEP_ADDED' }),
    );

    await user.type(screen.getByLabelText('Changed by (student number)'), 'abc');
    expect(api.listAuditLog).toHaveBeenLastCalledWith(
      expect.not.objectContaining({ actorId: expect.anything() }),
    );

    await user.clear(screen.getByLabelText('Changed by (student number)'));
    await user.type(screen.getByLabelText('Changed by (student number)'), '900000001');
    expect(api.listAuditLog).toHaveBeenLastCalledWith(
      expect.objectContaining({ actorId: 900000001 }),
    );
  });

  it('turns a date range into local day boundaries, with the last day included', async () => {
    render(<TrainingAuditLog />);
    await screen.findAllByRole('listitem');

    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-10-01' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-10-01' } });

    await waitFor(() =>
      expect(api.listAuditLog).toHaveBeenLastCalledWith(
        expect.objectContaining({
          from: new Date(2026, 9, 1).toISOString(),
          to: new Date(2026, 9, 2).toISOString(),
        }),
      ),
    );
  });

  it('adds the next page to the list, asking for the same snapshot time', async () => {
    const user = userEvent.setup();
    api.listAuditLog
      .mockResolvedValueOnce(page([entry({ id: 2, summary: 'Newest change' })], { hasNext: true }))
      .mockResolvedValueOnce(page([entry({ id: 1, summary: 'Older change' })], { page: 2 }));
    render(<TrainingAuditLog />);

    await screen.findByText('Newest change');
    await user.click(screen.getByRole('button', { name: 'Load older changes' }));

    expect(await screen.findByText('Older change')).toBeInTheDocument();
    expect(screen.getByText('Newest change')).toBeInTheDocument();
    expect(api.listAuditLog).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2, snapshotCreatedBefore: SNAPSHOT }),
    );
    expect(screen.queryByRole('button', { name: 'Load older changes' })).not.toBeInTheDocument();
  });

  it('says so when no change matches the filters', async () => {
    api.listAuditLog.mockResolvedValue(page([]));

    render(<TrainingAuditLog />);

    expect(await screen.findByText('No changes match these filters.')).toBeInTheDocument();
  });

  it('offers a retry when the log will not load', async () => {
    const user = userEvent.setup();
    api.listAuditLog
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce(page([entry({ summary: 'Back again' })]));

    render(<TrainingAuditLog />);

    expect(await screen.findByText(/couldn't load the audit log/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Back again')).toBeInTheDocument();
  });
});
