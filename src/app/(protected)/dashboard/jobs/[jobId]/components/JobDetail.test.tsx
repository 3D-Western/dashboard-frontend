import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/react';
import { jobApi } from '@/api/client/job';
import { render, screen, within } from '@test/utils/render';
import { JobDetail } from '@/types/jobs';
import { JobDetailHeader } from './JobDetailHeader';
import { JobInfo } from './JobInfo';
import { StagePanel } from './StagePanel';
import { StatusStepper } from './StatusStepper';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock('@/api/client/job', () => ({
  jobApi: { retryUpload: vi.fn(), uploadJobFile: vi.fn(), completeUpload: vi.fn() },
}));
vi.mock('@/lib/file-utils', () => ({ calculateFileChecksum: vi.fn(async () => 'sha256:test') }));

const baseJob: JobDetail = {
  id: 'job-123',
  name: 'Robot Arm Gear',
  description: 'Replacement gear',
  category: 'ThreeDPrint',
  user: { studentId: 251000001, firstName: 'Dev', lastName: 'User' },
  jobPlaced: '2026-10-01T10:00:00Z',
  dateSubmitted: '2026-10-01T10:00:00Z',
  files: [],
  status: 'InQueue',
  comments: '',
  filepath: 'uploads/gear.stl',
  formAnswersJson: '{}',
};

describe('StagePanel retry of an upload that did not finish', () => {
  const api = vi.mocked(jobApi);
  beforeEach(() => {
    api.retryUpload.mockReset().mockResolvedValue({
      fileId: 'f1',
      presignedUrl: 'https://storage.example/put',
      expiresIn: 900,
      storageKey: 'k',
    });
    api.uploadJobFile.mockReset().mockResolvedValue(new Response());
    api.completeUpload.mockReset().mockResolvedValue(null);
  });

  it('lets a student upload STEP, STL or 3MF again for a print, and sends the file with its type', async () => {
    render(<StagePanel job={{ ...baseJob, status: 'PendingFile' }} />);
    const input = screen.getByLabelText('Model file to upload') as HTMLInputElement;
    expect(input.accept).toBe('.stl,.3mf,.step,.stp');
    expect(screen.getByRole('button', { name: /Upload your file/ })).toBeVisible();

    await userEvent.upload(input, new File(['ISO-10303-21;'], 'bracket.step', { type: '' }));

    await waitFor(() => expect(api.completeUpload).toHaveBeenCalled());
    expect(api.uploadJobFile).toHaveBeenCalledWith('https://storage.example/put', expect.any(File));
    expect(api.completeUpload).toHaveBeenCalledWith(
      'job-123',
      expect.objectContaining({ fileName: 'bracket.step', contentType: 'model/step' }),
    );
  });

  it('does not upload a file the backend would refuse', async () => {
    const user = userEvent.setup({ applyAccept: false });
    render(<StagePanel job={{ ...baseJob, status: 'PendingFile' }} />);
    const input = screen.getByLabelText('Model file to upload') as HTMLInputElement;

    await user.upload(input, new File(['x'], 'notes.pdf', { type: 'application/pdf' }));

    expect(api.retryUpload).not.toHaveBeenCalled();
    expect(api.uploadJobFile).not.toHaveBeenCalled();
  });

  it('keeps STL only for a CNC job', () => {
    render(<StagePanel job={{ ...baseJob, category: 'CNC', status: 'PendingFile' }} />);

    expect((screen.getByLabelText('STL file to upload') as HTMLInputElement).accept).toBe('.stl');
    expect(screen.getByRole('button', { name: /Upload STL file/ })).toBeVisible();
  });
});

describe('StagePanel', () => {
  it('tells the user where to pick up a finished print', () => {
    render(
      <StagePanel
        job={{
          ...baseJob,
          status: 'Ready',
          pickupDetails: {
            location: 'Engineering Building, Room 101',
            hours: 'Mon-Fri, 9AM - 5PM',
            instructions: 'Bring your student ID',
          },
        }}
      />,
    );

    expect(screen.getByRole('heading', { name: /ready for pickup/i })).toBeInTheDocument();
    expect(screen.getByText('Engineering Building, Room 101')).toBeInTheDocument();
    expect(screen.getByText('Bring your student ID')).toBeInTheDocument();
  });

  it('shows why a job was declined and how to try again', () => {
    render(
      <StagePanel
        job={{
          ...baseJob,
          status: 'Flagged',
          statusHistory: [
            { status: 'Flagged', changedAt: '2026-10-02T10:00:00Z', comments: 'Walls too thin' },
          ],
        }}
      />,
    );

    expect(screen.getByRole('heading', { name: /declined/i })).toBeInTheDocument();
    expect(screen.getByText('Walls too thin')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /start a new job/i })).toHaveAttribute(
      'href',
      '/dashboard/jobs/print/new',
    );
  });

  it('lets the user upload the file for a job whose upload never finished', () => {
    render(<StagePanel job={{ ...baseJob, status: 'PendingFile' }} />);

    expect(screen.getByRole('button', { name: /upload your file/i })).toBeInTheDocument();
  });
});

describe('StatusStepper', () => {
  it('marks the current step of a job in progress', () => {
    render(
      <StatusStepper
        currentStatus="Printing"
        history={[
          { status: 'InQueue', changedAt: '2026-10-01T10:00:00Z' },
          { status: 'Printing', changedAt: '2026-10-02T10:00:00Z' },
        ]}
      />,
    );

    const steps = screen.getAllByRole('listitem');
    expect(steps).toHaveLength(5);
    expect(within(steps[2]).getByText('Printing')).toBeInTheDocument();
    expect(within(steps[2]).getByText(/current step/i)).toBeInTheDocument();
  });

  it('ends the timeline where a declined job stopped', () => {
    render(
      <StatusStepper
        currentStatus="Flagged"
        history={[
          { status: 'PendingFile', changedAt: '2026-10-01T09:00:00Z' },
          { status: 'Flagged', changedAt: '2026-10-01T10:00:00Z', comments: 'Over the size limit' },
        ]}
      />,
    );

    const steps = screen.getAllByRole('listitem');
    // Job created, then the issue; no queue/printing/pickup steps that will never happen
    expect(steps).toHaveLength(2);
    expect(within(steps[1]).getByText('Issue')).toBeInTheDocument();
    expect(screen.getByText('Over the size limit')).toBeInTheDocument();
    expect(screen.queryByText('Ready')).not.toBeInTheDocument();
  });
});

describe('JobInfo and JobDetailHeader on phones', () => {
  it('uses 12 px labels, a 14 px job ID and a 44 px menu and back link', () => {
    render(<JobDetailHeader job={baseJob} />);
    render(<JobInfo job={baseJob} />);

    const label = screen.getByText('Description');
    expect(label).toHaveClass('text-xs');
    expect(label).not.toHaveClass('text-[11px]');
    expect(screen.getByText('job-123')).toHaveClass('text-sm');
    expect(screen.getByRole('button', { name: 'More actions for Robot Arm Gear' })).toHaveClass(
      'size-11',
    );
    expect(screen.getByRole('link', { name: /my jobs/i })).toHaveClass('min-h-11');
  });

  it('leaves out the Created row and date when the job has no date, instead of showing blanks', () => {
    const undated: JobDetail = { ...baseJob, jobPlaced: '', dateSubmitted: '' };
    render(<JobInfo job={undated} />);
    render(<JobDetailHeader job={undated} />);

    expect(screen.queryByText('Created')).not.toBeInTheDocument();
    expect(screen.queryByText(/Created/)).not.toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
  });

  it('still shows the Created date when the job has one', () => {
    render(<JobInfo job={baseJob} />);
    expect(screen.getByText('Created')).toBeInTheDocument();
  });
});
