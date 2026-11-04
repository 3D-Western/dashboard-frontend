import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jobApi } from '@/api/client/job';
import { pipelineApi } from '@/api/client/pipeline';
import { createMockSnapshot } from '@test/utils/pipelineFactories';
import { PrintFlow } from './PrintFlow';

vi.mock('@/api/client/job', () => ({
  jobApi: {
    createJob: vi.fn(),
    uploadJobFile: vi.fn(),
    completeUpload: vi.fn(),
    retryUpload: vi.fn(),
  },
}));

vi.mock('@/api/client/pipeline', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/client/pipeline')>()),
  pipelineApi: {
    getState: vi.fn(),
    stream: vi.fn(),
    saveInputs: vi.fn(),
    confirm: vi.fn(),
    choose: vi.fn(),
    report: vi.fn(),
  },
}));

vi.mock('@/lib/file-utils', () => ({
  calculateFileChecksum: vi.fn(() => Promise.resolve('sha256:test')),
}));

const jobs = vi.mocked(jobApi);
const pipeline = vi.mocked(pipelineApi);
const setup = () => userEvent.setup({ pointerEventsCheck: 0 });
const model = () => new File(['solid'], 'robot-arm-gear.stl', { type: 'model/stl' });

function chooseFile(container: HTMLElement, file = model()) {
  const input = container.querySelector('input[type="file"]') as HTMLInputElement;
  return userEvent.upload(input, file);
}

beforeEach(() => {
  window.localStorage.clear();
  Object.values(jobs).forEach((fn) => fn.mockReset());
  Object.values(pipeline).forEach((fn) => fn.mockReset());
  jobs.createJob.mockResolvedValue({
    jobId: 'job-9',
    createdAt: '2026-11-04T10:00:00Z',
    fileId: 'file-9',
    uploadUrl: 'https://storage.example/upload',
    uploadExpiresIn: 900,
  });
  jobs.uploadJobFile.mockResolvedValue(new Response());
  jobs.completeUpload.mockResolvedValue(null);
  pipeline.getState.mockResolvedValue(createMockSnapshot());
  pipeline.stream.mockImplementation(
    (_id, { signal }) =>
      new Promise<void>((resolve) => signal?.addEventListener('abort', () => resolve())),
  );
  pipeline.saveInputs.mockResolvedValue(undefined);
});

describe('PrintFlow', () => {
  it('starts with the upload, before anything is asked', () => {
    render(<PrintFlow />);

    expect(screen.getByRole('heading', { name: '1. Your file' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /what's it for/i })).not.toBeInTheDocument();
    expect(screen.getByText(/STL, STEP or 3MF/)).toBeInTheDocument();
  });

  it('uploads at once, in the background, then opens the live progress while the student answers', async () => {
    const { container } = render(<PrintFlow />);

    await chooseFile(container);

    // Nothing was typed yet and the upload already ran end to end
    await waitFor(() => expect(jobs.completeUpload).toHaveBeenCalled());
    expect(jobs.createJob).toHaveBeenCalledWith(
      expect.objectContaining({ jobName: 'robot-arm-gear', category: 'ThreeDPrint' }),
    );
    // The student's own words come later, through the pipeline inputs: no placeholder text
    expect(jobs.createJob.mock.calls[0][0]).not.toHaveProperty('description');
    expect(jobs.uploadJobFile).toHaveBeenCalledWith(
      'https://storage.example/upload',
      expect.any(File),
    );
    expect(jobs.completeUpload).toHaveBeenCalledWith(
      'job-9',
      expect.objectContaining({ fileName: 'robot-arm-gear.stl', checksum: 'sha256:test' }),
    );
    // The questions are on screen while it processes, and the steps are streaming
    expect(screen.getByRole('heading', { name: /what's it for/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /tell us about your part/i })).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'Preparing your print' }),
    ).toBeInTheDocument();
    await waitFor(() => expect(pipeline.getState).toHaveBeenCalledWith('job-9', expect.anything()));
  });

  it('saves the purpose as soon as it is picked, then the student’s own words on continue', async () => {
    const user = setup();
    const { container } = render(<PrintFlow />);
    await chooseFile(container);
    await waitFor(() => expect(jobs.completeUpload).toHaveBeenCalled());

    await user.click(screen.getByRole('radio', { name: 'Class project' }));
    await user.type(screen.getByLabelText('Course'), 'MME 4499');
    await waitFor(() =>
      expect(pipeline.saveInputs).toHaveBeenLastCalledWith('job-9', {
        purpose: 'class',
        purposeDetails: { course: 'MME 4499' },
      }),
    );

    const words = screen.getByRole('textbox', { name: /tell us about your part/i });
    expect(words).toHaveValue('');
    await user.type(words, 'A replacement gear for my robot arm');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() =>
      expect(pipeline.saveInputs).toHaveBeenLastCalledWith('job-9', {
        purpose: 'class',
        purposeDetails: { course: 'MME 4499' },
        description: 'A replacement gear for my robot arm',
      }),
    );
    expect(await screen.findByText('Your answers are saved')).toBeInTheDocument();
  });

  it('does not let the student continue without a purpose and a few words of their own', async () => {
    const user = setup();
    const { container } = render(<PrintFlow />);
    await chooseFile(container);

    const next = await screen.findByRole('button', { name: 'Continue' });
    expect(next).toBeDisabled();
    await user.click(screen.getByRole('radio', { name: 'Personal project' }));
    expect(next).toBeDisabled();
    await user.type(
      screen.getByRole('textbox', { name: /tell us about your part/i }),
      'A desk hook',
    );
    expect(next).toBeEnabled();
  });

  it('remembers the purpose and its sub-form for next time', async () => {
    const user = setup();
    const first = render(<PrintFlow />);
    await chooseFile(first.container);
    await user.click(await screen.findByRole('radio', { name: 'Startup or venture' }));
    await user.type(screen.getByLabelText('Venture or business name'), 'Maple Gear Co.');
    first.unmount();

    const second = render(<PrintFlow />);
    await chooseFile(second.container);

    expect(await screen.findByRole('radio', { name: 'Startup or venture' })).toBeChecked();
    expect(screen.getByLabelText('Venture or business name')).toHaveValue('Maple Gear Co.');
  });

  it('shows what went wrong and retries the same job when the upload fails', async () => {
    jobs.uploadJobFile.mockRejectedValueOnce(new Error('File upload failed with status 500'));
    jobs.retryUpload.mockResolvedValue({
      fileId: 'f',
      presignedUrl: 'https://storage.example/retry',
      expiresIn: 900,
      storageKey: 'k',
    });
    const user = setup();
    const { container } = render(<PrintFlow />);

    await chooseFile(container);

    expect(await screen.findByText("Couldn't upload your file")).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() =>
      expect(jobs.completeUpload).toHaveBeenCalledWith('job-9', expect.anything()),
    );
    expect(jobs.createJob).toHaveBeenCalledTimes(1);
    expect(jobs.uploadJobFile).toHaveBeenLastCalledWith(
      'https://storage.example/retry',
      expect.any(File),
    );
  });

  it('keeps "Report a problem" in reach throughout', () => {
    render(<PrintFlow />);

    expect(screen.getByRole('button', { name: /report a problem/i })).toBeInTheDocument();
  });
});
