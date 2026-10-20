import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@test/utils/render';
import { JobDetail } from '@/types/jobs';
import { StagePanel } from './StagePanel';
import { StatusStepper } from './StatusStepper';

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

    expect(screen.getByRole('button', { name: /upload stl file/i })).toBeInTheDocument();
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
