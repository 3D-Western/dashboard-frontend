import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, waitFor, within } from '@test/utils/render';
import userEvent from '@testing-library/user-event';
import { pipelineReviewApi } from '@/api/client/pipeline-review';
import { ApiError } from '@/api/client/errors';
import { createFinding, createStaffUser } from '@test/utils/pipelineReviewFactories';
import type { StaffDecisionType } from '@/types/pipeline-review';
import { DecisionPanel } from './DecisionPanel';

vi.mock('@/api/client/pipeline-review', () => ({
  pipelineReviewApi: { decide: vi.fn() },
}));

const decide = pipelineReviewApi.decide as unknown as Mock;
const staff = createStaffUser(['jobs:update_status']);
const exec = createStaffUser(['jobs:update_status', 'jobs:resolve_escalation']);
const JOB = '11111111-1111-4111-8111-000000000001';
const ALL: StaffDecisionType[] = [
  'release',
  'approve',
  'reject',
  'escalate',
  'resolve_escalation',
  'rerun',
  'cancel',
];
const findings = [
  createFinding({ code: 'walls.too_thin' }),
  createFinding({ code: 'overhang.unsupported', message: 'The arm overhangs.' }),
];

function panel(user = staff, allowed: StaffDecisionType[] = ALL, onDecided = vi.fn()) {
  render(
    <DecisionPanel
      jobId={JOB}
      allowedDecisions={allowed}
      releasable={findings}
      onDecided={onDecided}
    />,
    { user },
  );
  return { onDecided, user: userEvent.setup() };
}

const answer = (overrides = {}) => ({
  actionId: 'a1',
  decision: 'approve',
  delivery: 'SENT',
  staffStatus: 'queued',
  studentStatus: 'queued',
  ...overrides,
});

beforeEach(() => {
  decide.mockReset();
});

describe('DecisionPanel permission gating', () => {
  it('never offers resolve escalation without jobs:resolve_escalation', () => {
    panel(staff);
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /resolve escalation/i })).not.toBeInTheDocument();
  });

  it('offers resolve escalation to staff who hold the elevated permission', () => {
    panel(exec, ['resolve_escalation', 'reject']);
    expect(screen.getByRole('button', { name: /resolve escalation/i })).toBeInTheDocument();
  });

  it('offers nothing to someone without jobs:update_status', () => {
    panel(createStaffUser([]));
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    expect(screen.getByText(/nothing to decide/i)).toBeInTheDocument();
  });

  it('only offers what the backend allowed for this status', () => {
    panel(staff, ['reject', 'rerun']);
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual([
      'Run again',
      'Reject',
    ]);
  });
});

describe('DecisionPanel required reasons', () => {
  it('will not send an approve without a reason', async () => {
    const { user } = panel();
    await user.click(screen.getByRole('button', { name: 'Approve' }));
    await user.click(screen.getByRole('button', { name: /^send decision$/i }));

    expect(await screen.findByText('A reason is required.')).toBeInTheDocument();
    expect(decide).not.toHaveBeenCalled();
  });

  it('refuses a reason shorter than the backend accepts', async () => {
    const { user } = panel();
    await user.click(screen.getByRole('button', { name: 'Run again' }));
    await user.type(screen.getByLabelText(/reason/i), 'ok');
    await user.click(screen.getByRole('button', { name: /^send decision$/i }));

    expect(await screen.findByText(/at least 3 characters/i)).toBeInTheDocument();
    expect(decide).not.toHaveBeenCalled();
  });

  it('asks for at least one finding before releasing', async () => {
    const { user } = panel();
    await user.click(screen.getByRole('button', { name: 'Release holds' }));
    await user.type(screen.getByLabelText(/reason/i), 'Thin walls are fine for a shelf bracket');
    await user.click(screen.getByRole('button', { name: /^send decision$/i }));

    expect(await screen.findByText(/pick at least one finding/i)).toBeInTheDocument();
    expect(decide).not.toHaveBeenCalled();
  });
});

describe('DecisionPanel decision payloads', () => {
  it('sends an approve straight away with only decision and reason', async () => {
    decide.mockResolvedValue(answer());
    const { user, onDecided } = panel();

    await user.click(screen.getByRole('button', { name: 'Approve' }));
    await user.type(screen.getByLabelText(/reason/i), '  Looked at the renders, fine.  ');
    await user.click(screen.getByRole('button', { name: /^send decision$/i }));

    await waitFor(() => expect(decide).toHaveBeenCalledTimes(1));
    const [jobId, body, key] = decide.mock.calls[0];
    expect(jobId).toBe(JOB);
    expect(body).toStrictEqual({ decision: 'approve', reason: 'Looked at the renders, fine.' });
    expect(key).toMatch(/^[0-9a-f-]{36}$/);
    expect(onDecided).toHaveBeenCalled();
    expect(await screen.findByText('Sent to the pipeline')).toBeInTheDocument();
  });

  it('sends the ticked finding codes with a release', async () => {
    decide.mockResolvedValue(answer({ decision: 'release' }));
    const { user } = panel();

    await user.click(screen.getByRole('button', { name: 'Release holds' }));
    await user.click(screen.getByRole('checkbox', { name: /walls\.too_thin/ }));
    await user.type(screen.getByLabelText(/reason/i), 'Thin walls are fine here');
    await user.click(screen.getByRole('button', { name: /^send decision$/i }));

    await waitFor(() => expect(decide).toHaveBeenCalled());
    expect(decide.mock.calls[0][1]).toStrictEqual({
      decision: 'release',
      reason: 'Thin walls are fine here',
      codes: ['walls.too_thin'],
    });
  });

  it('sends resolve_escalation for staff who may', async () => {
    decide.mockResolvedValue(
      answer({ decision: 'resolve_escalation', staffStatus: 'silent_review' }),
    );
    const { user } = panel(exec, ['resolve_escalation']);

    await user.click(screen.getByRole('button', { name: /resolve escalation/i }));
    await user.type(screen.getByLabelText(/reason/i), 'False positive: a pipe fitting');
    await user.click(screen.getByRole('button', { name: /^review and send/i }));
    await user.click(await screen.findByRole('button', { name: /^Yes, resolve escalation$/i }));

    await waitFor(() => expect(decide).toHaveBeenCalled());
    expect(decide.mock.calls[0][1]).toStrictEqual({
      decision: 'resolve_escalation',
      reason: 'False positive: a pipe fitting',
    });
  });
});

describe('DecisionPanel confirmation', () => {
  it.each([
    ['Reject', 'Reject'],
    ['Escalate', 'Escalate'],
    ['Cancel job', 'Cancel job'],
  ])('confirms %s before sending', async (button, label) => {
    decide.mockResolvedValue(answer({ decision: label.toLowerCase() }));
    const { user } = panel();

    await user.click(screen.getByRole('button', { name: button }));
    await user.type(screen.getByLabelText(/reason/i), 'Because of the content');
    await user.click(screen.getByRole('button', { name: /^review and send/i }));

    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText(/Because of the content/)).toBeInTheDocument();
    expect(decide).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole('button', { name: /^yes/i }));
    await waitFor(() => expect(decide).toHaveBeenCalledTimes(1));
  });

  it('sends nothing when the confirmation is declined', async () => {
    const { user } = panel();
    await user.click(screen.getByRole('button', { name: 'Reject' }));
    await user.type(screen.getByLabelText(/reason/i), 'Looks like a weapon');
    await user.click(screen.getByRole('button', { name: /^review and send/i }));
    await user.click(await screen.findByRole('button', { name: 'Go back' }));

    expect(decide).not.toHaveBeenCalled();
  });
});

describe('DecisionPanel results', () => {
  it('says so when the decision is queued behind a down pipeline', async () => {
    decide.mockResolvedValue(answer({ delivery: 'QUEUED' }));
    const { user } = panel();
    await user.click(screen.getByRole('button', { name: 'Approve' }));
    await user.type(screen.getByLabelText(/reason/i), 'Fine to print');
    await user.click(screen.getByRole('button', { name: /^send decision$/i }));

    expect(await screen.findByText('Queued for the pipeline')).toBeInTheDocument();
  });

  it('shows the backend message and keeps the form when a decision is refused', async () => {
    decide.mockRejectedValue(new ApiError('CONFLICT', 'Cannot approve a job in this status'));
    const { user } = panel();
    await user.click(screen.getByRole('button', { name: 'Approve' }));
    await user.type(screen.getByLabelText(/reason/i), 'Fine to print');
    await user.click(screen.getByRole('button', { name: /^send decision$/i }));

    expect(await screen.findByText('Cannot approve a job in this status')).toBeInTheDocument();
    expect(screen.getByLabelText(/reason/i)).toHaveValue('Fine to print');
  });

  it('retries with the same idempotency key after a failure', async () => {
    decide.mockRejectedValueOnce(new ApiError('REQUEST_FAILED', 'Network request failed'));
    decide.mockResolvedValueOnce(answer());
    const { user } = panel();
    await user.click(screen.getByRole('button', { name: 'Approve' }));
    await user.type(screen.getByLabelText(/reason/i), 'Fine to print');
    const send = () => screen.getByRole('button', { name: /^send decision$/i });
    await user.click(send());
    await screen.findByText('Network request failed');
    await user.click(send());

    await waitFor(() => expect(decide).toHaveBeenCalledTimes(2));
    expect(decide.mock.calls[1][2]).toBe(decide.mock.calls[0][2]);
  });
});
