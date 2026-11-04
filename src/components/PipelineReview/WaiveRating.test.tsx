import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@/api/client/errors';
import { pipelineFarmApi } from '@/api/client/pipeline-farm';
import { WaiveRating } from './WaiveRating';

vi.mock('@/api/client/pipeline-farm', () => ({ pipelineFarmApi: { waiveRating: vi.fn() } }));

const api = vi.mocked(pipelineFarmApi);
const setup = () => userEvent.setup({ pointerEventsCheck: 0 });
const JOB = '33333333-3333-4333-8333-000000000001';

beforeEach(() => {
  api.waiveRating.mockReset().mockResolvedValue({ ok: true, message: 'The rating is waived.' });
});

async function startWaiving(user: ReturnType<typeof setup>) {
  await user.click(screen.getByRole('button', { name: 'Waive rating' }));
}

describe('WaiveRating (staff, P-20)', () => {
  it('needs a reason before anything is sent, and says so', async () => {
    const user = setup();
    render(<WaiveRating jobId={JOB} />);

    await startWaiving(user);
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('A reason is required.');

    await user.type(screen.getByLabelText('Why is the rating waived?'), 'ab');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/at least 3/);

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(api.waiveRating).not.toHaveBeenCalled();
  });

  it('asks for a confirmation that repeats the reason, and sends only after the yes', async () => {
    const onWaived = vi.fn();
    const user = setup();
    render(<WaiveRating jobId={JOB} onWaived={onWaived} />);

    await startWaiving(user);
    await user.type(
      screen.getByLabelText('Why is the rating waived?'),
      '  Print was lost, student cannot rate  ',
    );
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('Print was lost, student cannot rate');
    expect(api.waiveRating).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Yes, waive it' }));

    await waitFor(() =>
      expect(api.waiveRating).toHaveBeenCalledWith(JOB, {
        reason: 'Print was lost, student cannot rate',
      }),
    );
    expect(await screen.findByRole('status')).toHaveTextContent('The rating is waived.');
    expect(screen.queryByRole('button', { name: 'Waive rating' })).not.toBeInTheDocument();
    expect(onWaived).toHaveBeenCalledTimes(1);
  });

  it('"Go back" at the confirmation sends nothing', async () => {
    const user = setup();
    render(<WaiveRating jobId={JOB} />);

    await startWaiving(user);
    await user.type(screen.getByLabelText('Why is the rating waived?'), 'left the club');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(await screen.findByRole('button', { name: 'Go back' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(api.waiveRating).not.toHaveBeenCalled();
  });

  it("shows the backend's answer when the print cannot be waived (409), keeping the reason to retry", async () => {
    api.waiveRating.mockRejectedValue(new ApiError('CONFLICT', 'That print already has a rating.'));
    const user = setup();
    render(<WaiveRating jobId={JOB} />);

    await startWaiving(user);
    await user.type(screen.getByLabelText('Why is the rating waived?'), 'left the club');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(await screen.findByRole('button', { name: 'Yes, waive it' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('That print already has a rating.');
    expect(screen.getByLabelText('Why is the rating waived?')).toHaveValue('left the club');
  });
});
