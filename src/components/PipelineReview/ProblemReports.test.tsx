import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { pipelineReviewApi } from '@/api/client/pipeline-review';
import { createProblemReport } from '@test/utils/pipelineReviewFactories';
import { ProblemReportCard, ProblemReportList } from './ProblemReports';

vi.mock('@/api/client/pipeline-review', () => ({
  pipelineReviewApi: { resolveReport: vi.fn() },
}));

const resolveReport = pipelineReviewApi.resolveReport as unknown as Mock;
const NOW = new Date('2026-11-03T18:00:00Z');

beforeEach(() => resolveReport.mockReset());

describe('ProblemReportCard', () => {
  it('needs a note before an open report can be resolved', async () => {
    const user = userEvent.setup();
    render(<ProblemReportCard report={createProblemReport({ id: 7 })} now={NOW} />);

    await user.click(screen.getByRole('button', { name: 'Resolve' }));
    await user.click(screen.getByRole('button', { name: 'Mark resolved' }));

    expect(await screen.findByText('A note is required.')).toBeInTheDocument();
    expect(resolveReport).not.toHaveBeenCalled();
  });

  it('sends the trimmed note to the report and tells the parent', async () => {
    const done = createProblemReport({ id: 7, status: 'RESOLVED', resolutionNote: 'Re-sliced it' });
    resolveReport.mockResolvedValue(done);
    const onResolved = vi.fn();
    const user = userEvent.setup();
    render(<ProblemReportCard report={createProblemReport({ id: 7 })} onResolved={onResolved} />);

    await user.click(screen.getByRole('button', { name: 'Resolve' }));
    await user.type(screen.getByLabelText(/resolution note/i), '  Re-sliced it  ');
    await user.click(screen.getByRole('button', { name: 'Mark resolved' }));

    await waitFor(() => expect(onResolved).toHaveBeenCalledWith(done));
    expect(resolveReport).toHaveBeenCalledWith(7, { note: 'Re-sliced it' });
  });

  it('does not offer to resolve a report that is already resolved', () => {
    render(
      <ProblemReportCard
        report={createProblemReport({
          status: 'RESOLVED',
          resolvedAt: '2026-11-03T17:00:00Z',
          resolutionNote: 'Re-sliced it',
        })}
        now={NOW}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Resolve' })).not.toBeInTheDocument();
    expect(screen.getByText(/Re-sliced it/)).toBeInTheDocument();
  });
});

describe('ProblemReportList', () => {
  it('links a report to its job', () => {
    render(<ProblemReportList reports={[createProblemReport({ id: 1 })]} now={NOW} />);
    expect(screen.getByRole('link', { name: /^Job / })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/admin\/review\/[0-9a-f-]{36}$/),
    );
  });
});
