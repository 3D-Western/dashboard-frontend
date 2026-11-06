import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@test/utils/render';
import { jobApi } from '@/api/client/job';
import { pipelineApi } from '@/api/client/pipeline';
import { createMockPlan, createMockSnapshot } from '@test/utils/pipelineFactories';
import type { JobDetail } from '@/types/jobs';
import JobDetailPage from './page';

vi.mock('@/api/client/job', () => ({ jobApi: { getJobById: vi.fn() } }));
vi.mock('@/api/client/pipeline', () => ({ pipelineApi: { getState: vi.fn() } }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock('./components/PipelineJobView', () => ({
  PipelineJobView: (props: { initialStatus: string; initialSnapshot: unknown }) => (
    <div
      data-testid="pipeline-view"
      data-status={props.initialStatus}
      data-has-snapshot={String(props.initialSnapshot !== null)}
    />
  ),
}));
vi.mock('@/components/Pipeline/ReportProblem', () => ({
  ReportProblem: ({ jobId }: { jobId?: string | null }) => (
    <div data-testid="report-problem" data-job-id={jobId ?? ''} />
  ),
}));
vi.mock('./components/JobDetailHeader', () => ({ JobDetailHeader: () => <header /> }));
vi.mock('./components/StagePanel', () => ({ StagePanel: () => <div /> }));
vi.mock('./components/JobInfo', () => ({ JobInfo: () => <div /> }));
vi.mock('./components/StatusStepper', () => ({ StatusStepper: () => <div /> }));
vi.mock('./components/FeatureProjectCta', () => ({ FeatureProjectCta: () => <div /> }));

const getJob = vi.mocked(jobApi.getJobById);
const getState = vi.mocked(pipelineApi.getState);

const job: JobDetail = {
  id: 'job-9',
  name: 'Phone Stand',
  description: '',
  category: 'ThreeDPrint',
  user: { studentId: 251000001, firstName: 'Dev', lastName: 'User' },
  jobPlaced: '2026-11-04T15:00:00Z',
  dateSubmitted: '2026-11-04T15:00:00Z',
  files: [],
  status: 'InQueue',
  comments: '',
  filepath: 'uploads/stand.stl',
  formAnswersJson: '{}',
};

const open = async () =>
  render(await JobDetailPage({ params: Promise.resolve({ jobId: 'job-9' }) }));

beforeEach(() => {
  getJob.mockReset();
  getState.mockReset();
});

describe('job page', () => {
  it('shows the live pipeline view for a new job before its row has a studentStatus', async () => {
    getJob.mockResolvedValue(job);
    getState.mockResolvedValue(createMockSnapshot({ studentStatus: 'preparing' }));

    await open();

    expect(screen.getByTestId('pipeline-view')).toHaveAttribute('data-status', 'preparing');
    expect(screen.getByTestId('pipeline-view')).toHaveAttribute('data-has-snapshot', 'true');
  });

  it('hands the review snapshot to the view so the review is in the first paint', async () => {
    getJob.mockResolvedValue({ ...job, studentStatus: 'needs_confirmation' });
    getState.mockResolvedValue(
      createMockSnapshot({ studentStatus: 'needs_confirmation', plan: createMockPlan() }),
    );

    await open();

    expect(screen.getByTestId('pipeline-view')).toHaveAttribute('data-has-snapshot', 'true');
  });

  it('reads the job and the pipeline state in parallel (no extra wait)', async () => {
    const order: string[] = [];
    getJob.mockImplementation(async () => {
      order.push('job:start');
      await Promise.resolve();
      return job;
    });
    getState.mockImplementation(async () => {
      order.push('state:start');
      return createMockSnapshot();
    });

    await open();

    expect(order.slice(0, 2).sort()).toEqual(['job:start', 'state:start']);
  });

  it('keeps the old page for a job the pipeline does not know, with the email version of "Report a problem"', async () => {
    getJob.mockResolvedValue(job);
    getState.mockRejectedValue(new Error('not a pipeline job'));

    await open();

    expect(screen.queryByTestId('pipeline-view')).not.toBeInTheDocument();
    expect(screen.getByTestId('report-problem')).toHaveAttribute('data-job-id', '');
  });

  it('ignores the pipeline state of a job that is not a 3D print', async () => {
    getJob.mockResolvedValue({ ...job, category: 'CNC' });
    getState.mockResolvedValue(createMockSnapshot());

    await open();

    expect(screen.queryByTestId('pipeline-view')).not.toBeInTheDocument();
  });

  it('says so when the job cannot be found', async () => {
    getJob.mockRejectedValue(new Error('404'));
    getState.mockRejectedValue(new Error('404'));

    await open();

    expect(screen.getByRole('heading', { name: 'Job not found' })).toBeInTheDocument();
  });
});
