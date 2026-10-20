import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@/api/client/errors';
import { signoffAPI } from '@/api/client/signoff';
import { createSignoff } from '@test/utils/signoffFactories';
import { SignoffDetail } from './SignoffDetail';

vi.mock('@/api/client/signoff', () => ({
  signoffAPI: { get: vi.fn(), approve: vi.fn(), reject: vi.fn() },
}));

const api = signoffAPI as unknown as { get: Mock; approve: Mock; reject: Mock };
const NOW = new Date('2026-10-20T16:30:00Z');

beforeEach(() => {
  api.get.mockReset();
  api.approve.mockReset();
  api.reject.mockReset();
});

const renderDetail = () => render(<SignoffDetail signoffId={9} now={NOW} />);
const approveButton = () => screen.getByRole('button', { name: /approve sign-off/i });

describe('SignoffDetail: the checklist gates Approve', () => {
  it('shows the student, the training and an unticked checklist with Approve disabled', async () => {
    api.get.mockResolvedValue(createSignoff());

    renderDetail();

    expect(await screen.findByRole('heading', { name: 'Alex Smith' })).toBeInTheDocument();
    expect(screen.getByText(/student number 251000123/i)).toBeInTheDocument();
    expect(screen.getByText(/laser cutter/i)).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox')).toHaveLength(3);
    expect(screen.getAllByRole('checkbox').every((box) => !(box as HTMLInputElement).checked)).toBe(
      true,
    );
    expect(screen.getByText('0 of 3 checked')).toBeInTheDocument();
    expect(approveButton()).toBeDisabled();
  });

  it('keeps Approve disabled until every item is ticked, then enables it', async () => {
    api.get.mockResolvedValue(createSignoff());
    renderDetail();
    await screen.findByRole('heading', { name: 'Alex Smith' });

    await userEvent.click(screen.getByLabelText('Shows where the emergency stop is'));
    await userEvent.click(screen.getByLabelText('Starts the ventilation'));
    expect(screen.getByText('2 of 3 checked')).toBeInTheDocument();
    expect(approveButton()).toBeDisabled();

    await userEvent.click(screen.getByLabelText('Sets the focus height'));
    expect(screen.getByText('3 of 3 checked')).toBeInTheDocument();
    expect(approveButton()).toBeEnabled();

    // Unticking one takes it away again
    await userEvent.click(screen.getByLabelText('Starts the ventilation'));
    expect(approveButton()).toBeDisabled();
  });

  it('sends every checklist key when approving, then shows the student as signed off', async () => {
    api.get.mockResolvedValue(createSignoff());
    api.approve.mockResolvedValue(
      createSignoff({
        status: 'APPROVED',
        decidedAt: '2026-10-20T16:29:00Z',
        decidedBy: { studentId: 1, firstName: 'Sam', lastName: 'Lee' },
        channel: 'DASHBOARD',
        checklistResult: [
          { key: 'estop', label: 'Shows where the emergency stop is', checked: true },
          { key: 'vent', label: 'Starts the ventilation', checked: true },
          { key: 'focus', label: 'Sets the focus height', checked: true },
        ],
      }),
    );
    renderDetail();
    await screen.findByRole('heading', { name: 'Alex Smith' });
    for (const box of screen.getAllByRole('checkbox')) await userEvent.click(box);

    await userEvent.click(approveButton());

    expect(api.approve).toHaveBeenCalledWith(9, ['estop', 'vent', 'focus']);
    expect(await screen.findByRole('heading', { name: 'Signed off' })).toBeInTheDocument();
    expect(screen.getByText(/by sam lee/i)).toBeInTheDocument();
    expect(screen.getByText(/alex smith is now certified/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /approve sign-off/i })).not.toBeInTheDocument();
  });

  it('cannot approve your own training, and says why', async () => {
    api.get.mockResolvedValue(createSignoff({ ownRequest: true }));

    renderDetail();

    expect(await screen.findByText(/this is your own training/i)).toBeInTheDocument();
    for (const box of screen.getAllByRole('checkbox')) expect(box).toBeDisabled();
    expect(approveButton()).toBeDisabled();
    expect(screen.getByRole('button', { name: /reject/i })).toBeDisabled();
  });

  it('shows the server message and the decision when someone else decided first', async () => {
    api.get.mockResolvedValueOnce(createSignoff()).mockResolvedValueOnce(
      createSignoff({
        status: 'APPROVED',
        decidedAt: '2026-10-20T16:29:00Z',
        decidedBy: { studentId: 2, firstName: 'Jo', lastName: 'Park' },
        channel: 'TEAMS',
      }),
    );
    api.approve.mockRejectedValue(new ApiError('SIGNOFF_ALREADY_DECIDED'));
    renderDetail();
    await screen.findByRole('heading', { name: 'Alex Smith' });
    for (const box of screen.getAllByRole('checkbox')) await userEvent.click(box);

    await userEvent.click(approveButton());

    expect(await screen.findByText(/someone else has already decided/i)).toBeInTheDocument();
    expect(await screen.findByText(/by jo park .* teams/i)).toBeInTheDocument();
  });
});

describe('SignoffDetail: rejecting', () => {
  it('needs a reason, then sends it with what was ticked', async () => {
    api.get.mockResolvedValue(createSignoff());
    api.reject.mockResolvedValue(
      createSignoff({
        status: 'REJECTED',
        decidedAt: '2026-10-20T16:29:00Z',
        decidedBy: { studentId: 1, firstName: 'Sam', lastName: 'Lee' },
        channel: 'DASHBOARD',
        notes: 'Could not find the emergency stop',
      }),
    );
    renderDetail();
    await screen.findByRole('heading', { name: 'Alex Smith' });
    await userEvent.click(screen.getByLabelText('Starts the ventilation'));

    await userEvent.click(screen.getByRole('button', { name: /not ready: reject/i }));
    const dialog = await screen.findByRole('dialog');
    const confirm = within(dialog).getByRole('button', { name: /reject sign-off/i });
    expect(confirm).toBeDisabled();

    await userEvent.type(within(dialog).getByLabelText('Reason'), '   ');
    expect(confirm).toBeDisabled();
    await userEvent.type(
      within(dialog).getByLabelText('Reason'),
      'Could not find the emergency stop',
    );
    expect(confirm).toBeEnabled();
    await userEvent.click(confirm);

    expect(api.reject).toHaveBeenCalledWith(9, 'Could not find the emergency stop', ['vent']);
    expect(await screen.findByRole('heading', { name: 'Not approved' })).toBeInTheDocument();
    expect(screen.getByText(/must retake the training/i)).toBeInTheDocument();
  });

  it('keeps the request open when the supervisor cancels the dialog', async () => {
    api.get.mockResolvedValue(createSignoff());
    renderDetail();
    await screen.findByRole('heading', { name: 'Alex Smith' });

    await userEvent.click(screen.getByRole('button', { name: /not ready: reject/i }));
    await userEvent.click(await screen.findByRole('button', { name: /^cancel$/i }));

    expect(api.reject).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('SignoffDetail: other states', () => {
  it('shows a decided request read-only with the stored checklist', async () => {
    api.get.mockResolvedValue(
      createSignoff({
        status: 'REJECTED',
        decidedAt: '2026-10-20T16:00:00Z',
        decidedBy: { studentId: 1, firstName: 'Sam', lastName: 'Lee' },
        channel: 'DASHBOARD',
        notes: 'Not confident yet',
        checklistResult: [
          { key: 'estop', label: 'Shows where the emergency stop is', checked: true },
          { key: 'vent', label: 'Starts the ventilation', checked: false },
        ],
      }),
    );

    renderDetail();

    expect(await screen.findByRole('heading', { name: 'Not approved' })).toBeInTheDocument();
    expect(screen.getByText(/reason: not confident yet/i)).toBeInTheDocument();
    expect(screen.getByText(/starts the ventilation/i)).toBeInTheDocument();
    expect(screen.getByText('(not checked)')).toBeInTheDocument();
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
  });

  it('shows an error with a retry when the request cannot be loaded', async () => {
    api.get.mockRejectedValueOnce(new ApiError('SIGNOFF_NOT_FOUND'));
    api.get.mockResolvedValueOnce(createSignoff());

    renderDetail();

    expect(await screen.findByText(/couldn't find that sign-off request/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(await screen.findByRole('heading', { name: 'Alex Smith' })).toBeInTheDocument();
  });
});
