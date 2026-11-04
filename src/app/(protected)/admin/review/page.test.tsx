import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@test/utils/render';
import { createStaffUser } from '@test/utils/pipelineReviewFactories';

const validateSession = vi.fn();
vi.mock('@/lib/auth', () => ({ validateSession: () => validateSession() }));
vi.mock('@/components/PipelineReview/ReviewQueue', () => ({
  ReviewQueue: () => <div>queue here</div>,
}));
vi.mock('@/components/PipelineReview/FarmDesk', () => ({
  FarmDesk: () => <div>farm here</div>,
}));
vi.mock('@/components/PipelineReview/ReviewJobView', () => ({
  ReviewJobView: ({ jobId }: { jobId: string }) => <div>job {jobId}</div>,
}));

import PrintReviewPage from './page';
import ReviewJobPage from './[jobId]/page';
import PrintFarmPage from './farm/page';

const JOB = '11111111-1111-4111-8111-000000000001';

beforeEach(() => validateSession.mockReset());

describe('Print review pages', () => {
  it('shows the queue to staff with jobs:update_status', async () => {
    validateSession.mockResolvedValue(createStaffUser(['jobs:update_status']));
    render(await PrintReviewPage());
    expect(screen.getByText('queue here')).toBeInTheDocument();
  });

  it('shows students (own-scope job permissions only) an access denied page', async () => {
    const student = createStaffUser([]);
    student.permissions = [{ key: 'jobs:update_status', scopeKey: 'own' }];
    validateSession.mockResolvedValue(student);
    render(await PrintReviewPage());
    expect(screen.queryByText('queue here')).not.toBeInTheDocument();
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
  });

  it('keeps the job view from anyone who is not staff', async () => {
    validateSession.mockResolvedValue(createStaffUser(['jobs:resolve_escalation']));
    render(await ReviewJobPage({ params: Promise.resolve({ jobId: JOB }) }));
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
  });

  it('opens the job view for staff', async () => {
    validateSession.mockResolvedValue(createStaffUser());
    render(await ReviewJobPage({ params: Promise.resolve({ jobId: JOB }) }));
    expect(screen.getByText(`job ${JOB}`)).toBeInTheDocument();
  });

  it('links the queue to the print farm screen', async () => {
    validateSession.mockResolvedValue(createStaffUser(['jobs:update_status']));
    render(await PrintReviewPage());
    expect(screen.getByRole('link', { name: /print farm/i })).toHaveAttribute(
      'href',
      '/admin/review/farm',
    );
  });

  it('shows the print farm to staff and keeps it from everyone else', async () => {
    validateSession.mockResolvedValue(createStaffUser(['jobs:update_status']));
    const { unmount } = render(await PrintFarmPage());
    expect(screen.getByText('farm here')).toBeInTheDocument();
    unmount();

    validateSession.mockResolvedValue(createStaffUser([]));
    render(await PrintFarmPage());
    expect(screen.queryByText('farm here')).not.toBeInTheDocument();
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
  });
});
