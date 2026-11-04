import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { pipelineApi } from '@/api/client/pipeline';
import { ReportProblem } from './ReportProblem';

vi.mock('@/api/client/pipeline', () => ({ pipelineApi: { report: vi.fn() } }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const report = vi.mocked(pipelineApi.report);
const setup = () => userEvent.setup({ pointerEventsCheck: 0 });

beforeEach(() => report.mockReset());

describe('ReportProblem', () => {
  it('is always on screen and sends the report for this job', async () => {
    report.mockResolvedValue(undefined);
    const user = setup();
    render(<ReportProblem jobId="job-5" />);

    await user.click(screen.getByRole('button', { name: /report a problem/i }));
    const send = screen.getByRole('button', { name: 'Send report' });
    expect(send).toBeDisabled();
    await user.type(screen.getByLabelText('What went wrong?'), 'The preview shows the wrong part');
    await user.click(send);

    await waitFor(() =>
      expect(report).toHaveBeenCalledWith('job-5', 'The preview shows the wrong part'),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('points to the club email where there is no job to attach it to', async () => {
    const user = setup();
    render(<ReportProblem />);

    await user.click(screen.getByRole('button', { name: /report a problem/i }));

    expect(screen.getByRole('link', { name: 'Email the crew' })).toHaveAttribute(
      'href',
      expect.stringMatching(/^mailto:/),
    );
    expect(report).not.toHaveBeenCalled();
  });
});
