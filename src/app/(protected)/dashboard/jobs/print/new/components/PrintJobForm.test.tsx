import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { jobApi } from '@/api/client/job';
import { ApiError } from '@/api/client/errors';
import PrintJobForm from './PrintJobForm';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/api/client/job', () => ({
  jobApi: { createJob: vi.fn(), uploadJobFile: vi.fn(), completeUpload: vi.fn() },
}));
vi.mock('@/components/UnsavedChangesDialog', () => ({ UnsavedChangesDialog: () => null }));
vi.mock('./PrintAllowance', () => ({ PrintAllowance: () => null }));
// Dropping a real file needs a browser; this stands in for "the student picked an STL"
vi.mock('@/components/FileUploadDropzone', () => ({
  FileUploadDropzone: ({ onFileAccepted }: { onFileAccepted: (file: File) => void }) => (
    <button
      type="button"
      onClick={() => onFileAccepted(new File(['solid'], 'gear.stl', { type: 'model/stl' }))}
    >
      Pick file
    </button>
  ),
}));

const createJob = vi.mocked(jobApi.createJob);
const scrollIntoView = vi.fn();
beforeEach(() => {
  Element.prototype.scrollIntoView = scrollIntoView;
});

async function fillAndSubmit() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Project title'), 'Gear');
  await user.click(screen.getByRole('button', { name: 'Pick file' }));
  await user.type(screen.getByLabelText('Description'), 'A replacement gear');
  await user.click(screen.getByRole('radio', { name: /school project/i }));
  await user.click(screen.getByRole('radio', { name: /functional/i }));
  await user.click(screen.getByRole('button', { name: 'Submit job' }));
}

beforeEach(() => vi.clearAllMocks());

describe('PrintJobForm: orientation refusal', () => {
  it('shows the locked state and says so when the server answers ORIENTATION_REQUIRED', async () => {
    createJob.mockRejectedValue(
      new ApiError('ORIENTATION_REQUIRED', 'Finish Maker Orientation to submit prints.'),
    );
    render(<PrintJobForm />);

    expect(
      screen.queryByRole('heading', { name: 'Finish Maker Orientation to submit prints' }),
    ).not.toBeInTheDocument();
    await fillAndSubmit();

    expect(
      await screen.findByRole('heading', { name: 'Finish Maker Orientation to submit prints' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /go to maker orientation/i })).toHaveAttribute(
      'href',
      '/dashboard/training',
    );
    // It can't be missed on a phone: announced, scrolled to, and holding focus
    const notice = screen.getByRole('alert');
    expect(notice).toHaveTextContent('Finish Maker Orientation to submit prints');
    expect(notice).toHaveFocus();
    expect(scrollIntoView).toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('Finish Maker Orientation to submit prints.');
    // Nothing was uploaded, and the form can't be submitted again until orientation is done
    expect(jobApi.uploadJobFile).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Submit job' })).toBeDisabled());
  });

  it('keeps the ordinary error toast for other failures', async () => {
    createJob.mockRejectedValue(new Error('boom'));
    render(<PrintJobForm />);
    await fillAndSubmit();

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Failed to submit print request. boom'),
    );
    expect(
      screen.queryByRole('link', { name: /go to maker orientation/i }),
    ).not.toBeInTheDocument();
  });
});

describe('PrintJobForm: phone layout', () => {
  it('limits the project title to 30 characters and counts them', async () => {
    render(<PrintJobForm />);
    const title = screen.getByLabelText('Project title');

    expect(title).toHaveAttribute('maxLength', '30');
    await userEvent.type(title, 'Gear');
    expect(screen.getByText('4/30')).toBeInTheDocument();
  });

  it('gives purpose chips a 44 px tap target and a full-width submit in a sticky footer', () => {
    render(<PrintJobForm />);

    expect(screen.getByRole('radio', { name: /school project/i })).toHaveClass('min-h-11');
    const submit = screen.getByRole('button', { name: 'Submit job' });
    expect(submit).toHaveClass('min-h-11', 'w-full', 'md:w-auto');
    expect(submit.parentElement).toHaveClass('sticky', 'bottom-0', 'md:static');
  });
});
