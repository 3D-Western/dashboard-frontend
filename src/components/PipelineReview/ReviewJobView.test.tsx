import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, waitFor, within } from '@test/utils/render';
import userEvent from '@testing-library/user-event';
import { pipelineReviewApi } from '@/api/client/pipeline-review';
import {
  HELD_JOB_ID,
  createProblemReport,
  createStaffDecisionRecord,
  createStaffEvent,
  createStaffJobView,
  createStaffUser,
  createSubmission,
} from '@test/utils/pipelineReviewFactories';
import { ReviewJobView } from './ReviewJobView';

vi.mock('@/api/client/pipeline-review', () => ({
  pipelineReviewApi: { job: vi.fn(), requeue: vi.fn(), decide: vi.fn(), resolveReport: vi.fn() },
}));
// The 3D viewer is its own tested component; here only that it is given the regions matters.
vi.mock('@/components/Pipeline/PartViewerSlot', () => ({
  PartViewerSlot: ({
    highlights,
    audience,
  }: {
    highlights?: { code: string }[];
    audience?: string;
  }) => (
    <div
      data-testid="part-viewer"
      data-audience={audience}
      data-codes={(highlights ?? []).map((h) => h.code).join(',')}
    />
  ),
}));

const api = pipelineReviewApi as unknown as Record<'job' | 'requeue', Mock>;
const staff = createStaffUser(['jobs:update_status']);

beforeEach(() => {
  api.job.mockReset();
  api.requeue.mockReset();
});

describe('ReviewJobView', () => {
  it('shows each finding with its measured value, threshold and region', async () => {
    api.job.mockResolvedValue(createStaffJobView());
    render(<ReviewJobView jobId={HELD_JOB_ID} refreshMs={0} />, { user: staff });

    const finding = (await screen.findByText('walls.too_thin')).closest('article');
    expect(finding).not.toBeNull();
    const card = within(finding as HTMLElement);
    expect(card.getByTestId('evidence-value')).toHaveTextContent('0.6 mm');
    expect(card.getByTestId('evidence-threshold')).toHaveTextContent('0.8 mm');
    expect(card.getByText(/box 10, 0, 2, 14, 8, 9 mm/)).toBeInTheDocument();
    expect(card.getByText('70%')).toBeInTheDocument();
  });

  it('hands the findings that have a region to the 3D viewer', async () => {
    api.job.mockResolvedValue(createStaffJobView());
    render(<ReviewJobView jobId={HELD_JOB_ID} refreshMs={0} />, { user: staff });

    const viewer = await screen.findByTestId('part-viewer');
    expect(viewer).toHaveAttribute('data-codes', 'walls.too_thin,overhang.unsupported');
  });

  it('shows the screening renders as images', async () => {
    api.job.mockResolvedValue(
      createStaffJobView({
        events: [
          createStaffEvent({
            seq: 4,
            data: {
              staff_artifacts: [
                { kind: 'screening_png', name: 'front', url: '/renders/front.png' },
                { kind: 'screening_png', name: 'top' },
              ],
            },
          }),
        ],
      }),
    );
    render(<ReviewJobView jobId={HELD_JOB_ID} refreshMs={0} />, { user: staff });

    expect(await screen.findByRole('img', { name: /front/ })).toBeInTheDocument();
    expect(screen.getByText('Stored, but no link to show it')).toBeInTheDocument();
  });

  it('lists the student inputs, past decisions and events', async () => {
    api.job.mockResolvedValue(
      createStaffJobView({
        decisions: [createStaffDecisionRecord({ reason: 'Looked fine to me' })],
        reports: [createProblemReport({ text: 'Is it ok?' })],
      }),
    );
    render(<ReviewJobView jobId={HELD_JOB_ID} refreshMs={0} />, { user: staff });

    expect(
      await screen.findByText('A bracket that holds a shelf to the bench.'),
    ).toBeInTheDocument();
    expect(screen.getByText('MECH 2100')).toBeInTheDocument();
    expect(screen.getByText('Looked fine to me')).toBeInTheDocument();
    expect(screen.getByText('Is it ok?')).toBeInTheDocument();
    expect(screen.getByText(/Held for review: thin walls/)).toBeInTheDocument();
  });

  it('shows a FAILED submission with a requeue button that requeues this job', async () => {
    api.job.mockResolvedValue(
      createStaffJobView({
        submission: createSubmission({ status: 'FAILED', attempts: 3, lastError: 'mesh invalid' }),
      }),
    );
    api.requeue.mockResolvedValue(createSubmission({ status: 'PENDING' }));
    const user = userEvent.setup();
    render(<ReviewJobView jobId={HELD_JOB_ID} refreshMs={0} />, { user: staff });

    expect(await screen.findByText(/mesh invalid/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /requeue submission/i }));

    await waitFor(() => expect(api.requeue).toHaveBeenCalledWith(HELD_JOB_ID));
    await waitFor(() => expect(api.job).toHaveBeenCalledTimes(2));
  });

  it('offers no resolve-escalation to staff without the elevated permission, even if sent', async () => {
    api.job.mockResolvedValue(
      createStaffJobView({
        staffStatus: 'escalated',
        allowedDecisions: ['resolve_escalation', 'reject', 'cancel'],
      }),
    );
    render(<ReviewJobView jobId={HELD_JOB_ID} refreshMs={0} />, { user: staff });

    await screen.findByRole('button', { name: 'Reject' });
    expect(screen.queryByRole('button', { name: /resolve escalation/i })).not.toBeInTheDocument();
  });

  it('explains when the job cannot be loaded', async () => {
    api.job.mockRejectedValue(new Error('Job not found'));
    render(<ReviewJobView jobId={HELD_JOB_ID} refreshMs={0} />, { user: staff });
    expect(await screen.findByText('Job not found')).toBeInTheDocument();
  });
});

describe('ReviewJobView screening renders from the real wire shape', () => {
  it('shows each render from the url the backend added, named by the pipeline’s `view`, linked full size', async () => {
    api.job.mockResolvedValue(
      createStaffJobView({
        events: [
          createStaffEvent({
            seq: 6,
            data: {
              // What the pipeline stores (kind, view, storage ref, sha256) plus the backend's link
              staff_artifacts: [
                {
                  kind: 'screening_png',
                  view: 'iso',
                  bucket: 'artifacts',
                  key: 'screening/job-1/1/iso.png',
                  sha256: 'abc',
                  content_type: 'image/png',
                  url: 'https://files.example/iso.png?sig=1',
                },
                {
                  kind: 'screening_png',
                  bucket: 'artifacts',
                  key: 'screening/job-1/1/top.png',
                  sha256: 'def',
                  url: 'https://files.example/top.png?sig=2',
                },
              ],
            },
          }),
        ],
      }),
    );
    render(<ReviewJobView jobId={HELD_JOB_ID} refreshMs={0} />, { user: staff });

    const iso = await screen.findByRole('img', { name: 'Screening render: iso' });
    expect(iso).toHaveAttribute('src', 'https://files.example/iso.png?sig=1');
    expect(screen.getByRole('link', { name: /open the iso render full size/i })).toHaveAttribute(
      'href',
      'https://files.example/iso.png?sig=1',
    );
    // A ref with no `view` is still named, from the end of its storage key
    expect(screen.getByRole('img', { name: 'Screening render: top' })).toHaveAttribute(
      'src',
      'https://files.example/top.png?sig=2',
    );
  });

  it('asks the 3D viewer for its staff wording', async () => {
    api.job.mockResolvedValue(createStaffJobView());
    render(<ReviewJobView jobId={HELD_JOB_ID} refreshMs={0} />, { user: staff });

    expect(await screen.findByTestId('part-viewer')).toHaveAttribute('data-audience', 'staff');
  });
});
