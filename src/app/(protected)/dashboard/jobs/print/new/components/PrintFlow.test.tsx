import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jobApi } from '@/api/client/job';
import { ApiError } from '@/api/client/errors';
import { pipelineApi } from '@/api/client/pipeline';
import { createMockPlan, createMockSnapshot } from '@test/utils/pipelineFactories';
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
    rate: vi.fn(),
    reportQuality: vi.fn(),
    pendingRatings: vi.fn(),
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
  pipeline.pendingRatings.mockResolvedValue([]);
});

describe('PrintFlow', () => {
  it('starts with the upload, before anything is asked', async () => {
    render(<PrintFlow />);

    expect(screen.getByRole('heading', { name: '1. Your file' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /what's it for/i })).not.toBeInTheDocument();
    expect(screen.getByText(/STL, STEP or 3MF/)).toBeInTheDocument();
  });

  it.each([
    ['bracket.step', ''],
    ['Bracket.STP', 'application/step'],
    ['housing.step', 'model/step'],
    ['housing.step', 'application/octet-stream'],
  ])(
    'takes a STEP file (%s, reported as "%s") like any model and uploads it at once',
    async (name, type) => {
      const { container } = render(<PrintFlow />);

      await chooseFile(container, new File(['ISO-10303-21;'], name, { type }));

      await waitFor(() => expect(jobs.completeUpload).toHaveBeenCalled());
      expect(jobs.createJob).toHaveBeenCalledWith(
        expect.objectContaining({
          jobName: name.replace(/\.[^.]+$/, ''),
          category: 'ThreeDPrint',
          formAnswerJson: expect.stringContaining('"contentType":"' + (type || 'model/step') + '"'),
        }),
      );
      expect(jobs.uploadJobFile).toHaveBeenCalledWith(
        'https://storage.example/upload',
        expect.any(File),
      );
      expect(jobs.completeUpload).toHaveBeenCalledWith(
        'job-9',
        expect.objectContaining({ fileName: name, contentType: type || 'model/step' }),
      );
      expect(screen.queryByTestId('file-problem')).not.toBeInTheDocument();
    },
  );

  it('refuses a model over the size limit, and a file of another type, before anything is uploaded', async () => {
    const user = userEvent.setup({ applyAccept: false });
    const { container } = render(<PrintFlow />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    const huge = new File(['x'], 'big.step', { type: 'application/step' });
    Object.defineProperty(huge, 'size', { value: 51 * 1024 * 1024 });
    await user.upload(input, huge);
    expect(await screen.findByTestId('file-problem')).toHaveTextContent('limit is 50 MB');

    await user.upload(input, new File(['x'], 'notes.pdf', { type: 'application/pdf' }));
    await waitFor(() => expect(screen.getByTestId('file-problem')).toBeInTheDocument());
    expect(jobs.createJob).not.toHaveBeenCalled();
    expect(jobs.uploadJobFile).not.toHaveBeenCalled();
  });

  it('accepts a STEP file exactly at the size limit', async () => {
    const { container } = render(<PrintFlow />);
    const exactly = new File(['x'], 'limit.stp', { type: '' });
    Object.defineProperty(exactly, 'size', { value: 50 * 1024 * 1024 });

    await chooseFile(container, exactly);

    await waitFor(() => expect(jobs.createJob).toHaveBeenCalled());
    expect(screen.queryByTestId('file-problem')).not.toBeInTheDocument();
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

  it('saves the purpose as soon as it is picked, then the student’s own words once they stop typing', async () => {
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
    // No Continue to tap: the pause after typing saves it
    await waitFor(
      () =>
        expect(pipeline.saveInputs).toHaveBeenLastCalledWith('job-9', {
          purpose: 'class',
          purposeDetails: { course: 'MME 4499' },
          description: 'A replacement gear for my robot arm',
        }),
      { timeout: 5000 },
    );
    expect(await screen.findByText('Your answers are saved')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Continue' })).not.toBeInTheDocument();
  });

  it('saves the words at once when the student leaves the field', async () => {
    const user = setup();
    const { container } = render(<PrintFlow />);
    await chooseFile(container);
    await waitFor(() => expect(jobs.completeUpload).toHaveBeenCalled());
    await user.click(screen.getByRole('radio', { name: 'Personal project' }));

    await user.type(
      screen.getByRole('textbox', { name: /tell us about your part/i }),
      'A desk hook',
    );
    await user.tab();

    await waitFor(() =>
      expect(pipeline.saveInputs).toHaveBeenLastCalledWith(
        'job-9',
        expect.objectContaining({ purpose: 'personal', description: 'A desk hook' }),
      ),
    );
  });

  it('shows the review below the form only once the purpose and the student’s own words are in, with no Continue step', async () => {
    pipeline.getState.mockResolvedValue(
      createMockSnapshot({ studentStatus: 'needs_confirmation', plan: createMockPlan() }),
    );
    const user = setup();
    const { container } = render(<PrintFlow />);
    await chooseFile(container);
    await screen.findByRole('radio', { name: 'Personal project' });

    expect(screen.queryByRole('button', { name: 'Continue' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /yes, print this/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'Personal project' }));
    await user.type(
      screen.getByRole('textbox', { name: /tell us about your part/i }),
      'A desk hook',
    );
    expect(screen.queryByRole('button', { name: /yes, print this/i })).not.toBeInTheDocument();
    await user.tab();

    // The form stays on screen, editable, with the review right under it
    expect(await screen.findByRole('button', { name: /yes, print this/i })).toBeEnabled();
    expect(screen.getByRole('textbox', { name: /tell us about your part/i })).toBeEnabled();
  });

  describe('after the review is shown', () => {
    async function openReview() {
      pipeline.getState.mockResolvedValue(
        createMockSnapshot({ studentStatus: 'needs_confirmation', plan: createMockPlan() }),
      );
      const user = setup();
      const { container } = render(<PrintFlow />);
      await chooseFile(container);
      await user.click(await screen.findByRole('radio', { name: 'Personal project' }));
      await user.type(
        screen.getByRole('textbox', { name: /tell us about your part/i }),
        'A desk hook',
      );
      await user.tab();
      await screen.findByRole('button', { name: /yes, print this/i });
      await waitFor(() =>
        expect(screen.getByRole('button', { name: /yes, print this/i })).toBeEnabled(),
      );
      return user;
    }

    it('keeps the review (and the yes) on screen while the student edits, holding the yes until the edit is saved', async () => {
      const user = await openReview();
      pipeline.saveInputs.mockClear();

      await user.type(
        screen.getByRole('textbox', { name: /tell us about your part/i }),
        ' on a wall',
      );

      // Not back to the steps-only view: the yes is still there, waiting for the save
      const yes = screen.getByRole('button', { name: /yes, print this/i });
      expect(yes).toBeDisabled();
      expect(screen.getByText(/saving your changes first/i)).toBeInTheDocument();
      await user.tab();
      await waitFor(() =>
        expect(pipeline.saveInputs).toHaveBeenLastCalledWith(
          'job-9',
          expect.objectContaining({ description: 'A desk hook on a wall' }),
        ),
      );
      await waitFor(() =>
        expect(screen.getByRole('button', { name: /yes, print this/i })).toBeEnabled(),
      );
    });

    it('locks the answers once the student says yes, and saves nothing more', async () => {
      const user = await openReview();
      pipeline.confirm.mockResolvedValue(undefined);
      pipeline.saveInputs.mockClear();

      await user.click(screen.getByRole('button', { name: /yes, print this/i }));

      await waitFor(() =>
        expect(screen.getByRole('textbox', { name: /tell us about your part/i })).toBeDisabled(),
      );
      expect(screen.getByRole('radio', { name: 'Personal project' })).toBeDisabled();
      expect(screen.getByText(/your answers are locked/i)).toBeInTheDocument();
      expect(pipeline.saveInputs).not.toHaveBeenCalled();
    });

    it('treats a 409 on saving the answers as "already sent", not as a changed plan or a save error', async () => {
      const user = await openReview();
      pipeline.saveInputs.mockRejectedValue(new ApiError('CONFLICT', 'The job is closed'));

      await user.type(screen.getByRole('textbox', { name: /tell us about your part/i }), ' now');
      await user.tab();

      await waitFor(() =>
        expect(screen.getByRole('textbox', { name: /tell us about your part/i })).toBeDisabled(),
      );
      expect(screen.queryByText(/couldn.t save your answers/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/plan changed/i)).not.toBeInTheDocument();
    });
  });

  describe('saving while typing (P-192)', () => {
    it('saves the description once per pause, and no more often than every 8 seconds while the student keeps typing', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      try {
        const user = userEvent.setup({
          pointerEventsCheck: 0,
          advanceTimers: vi.advanceTimersByTime,
        });
        const { container } = render(<PrintFlow />);
        await chooseFile(container);
        await waitFor(() => expect(jobs.completeUpload).toHaveBeenCalled());
        await user.click(await screen.findByRole('radio', { name: 'Personal project' }));
        await vi.advanceTimersByTimeAsync(800);
        const words = screen.getByRole('textbox', { name: /tell us about your part/i });
        pipeline.saveInputs.mockClear();

        await user.type(words, 'A phone holder shaped like a keychain');
        await vi.advanceTimersByTimeAsync(2600); // the pause: saved
        expect(pipeline.saveInputs).toHaveBeenCalledTimes(1);

        await user.type(words, ' with a loop');
        await vi.advanceTimersByTimeAsync(2600); // another pause, but it is too soon after the last save
        expect(pipeline.saveInputs).toHaveBeenCalledTimes(1);
        await vi.advanceTimersByTimeAsync(6000);
        expect(pipeline.saveInputs).toHaveBeenCalledTimes(2);
        expect(pipeline.saveInputs).toHaveBeenLastCalledWith(
          'job-9',
          expect.objectContaining({
            description: 'A phone holder shaped like a keychain with a loop',
          }),
        );
      } finally {
        vi.useRealTimers();
      }
    });

    it('saves again by itself a little later when the pipeline says there were too many changes (429)', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      try {
        const user = userEvent.setup({
          pointerEventsCheck: 0,
          advanceTimers: vi.advanceTimersByTime,
        });
        const { container } = render(<PrintFlow />);
        await chooseFile(container);
        await waitFor(() => expect(jobs.completeUpload).toHaveBeenCalled());
        await user.click(await screen.findByRole('radio', { name: 'Personal project' }));
        await vi.advanceTimersByTimeAsync(800);
        pipeline.saveInputs.mockClear();
        pipeline.saveInputs.mockRejectedValueOnce(new ApiError('RATE_LIMIT_EXCEEDED', 'Slow down'));

        await user.type(
          screen.getByRole('textbox', { name: /tell us about your part/i }),
          'A desk hook',
        );
        await user.tab();
        await vi.advanceTimersByTimeAsync(100);
        expect(pipeline.saveInputs).toHaveBeenCalledTimes(1);
        expect(screen.queryByText(/couldn.t save your answers/i)).not.toBeInTheDocument();
        await vi.advanceTimersByTimeAsync(31_000);
        expect(pipeline.saveInputs).toHaveBeenCalledTimes(2);
      } finally {
        vi.useRealTimers();
      }
    });
  });

  it('puts a returning student straight into the description', async () => {
    const user = setup();
    const first = render(<PrintFlow />);
    await chooseFile(first.container);
    await user.click(await screen.findByRole('radio', { name: 'Personal project' }));
    first.unmount();

    const second = render(<PrintFlow />);
    await chooseFile(second.container);

    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: /tell us about your part/i })).toHaveFocus(),
    );
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

  it('keeps "Report a problem" in reach throughout', async () => {
    render(<PrintFlow />);

    expect(screen.getByRole('button', { name: /report a problem/i })).toBeInTheDocument();
  });

  describe('rate first (P-20)', () => {
    const ratingRequired = (prints: unknown[]) =>
      new ApiError(
        'RATING_REQUIRED',
        'Please rate your previous print first.',
        undefined,
        undefined,
        { unratedPrints: prints },
      );

    it('holds the upload for one tap when the backend says a collected print is unrated, then carries on with the same file', async () => {
      jobs.createJob
        .mockRejectedValueOnce(
          ratingRequired([
            { jobId: 'old-1', name: 'Hinge Pair', collectedAt: '2026-11-01T10:00:00Z' },
          ]),
        )
        .mockResolvedValue({
          jobId: 'job-9',
          createdAt: '2026-11-04T10:00:00Z',
          fileId: 'file-9',
          uploadUrl: 'https://storage.example/upload',
          uploadExpiresIn: 900,
        });
      pipeline.rate.mockResolvedValue(createMockSnapshot());
      const { container } = render(<PrintFlow />);

      await chooseFile(container);

      expect(await screen.findByTestId('rating-required')).toBeVisible();
      expect(screen.getByRole('heading', { name: /how did hinge pair turn out/i })).toBeVisible();
      // No upload happened, and the questions about the new part wait
      expect(jobs.uploadJobFile).not.toHaveBeenCalled();
      expect(screen.queryByRole('heading', { name: /what's it for/i })).not.toBeInTheDocument();

      await setup().click(screen.getByRole('button', { name: 'Good' }));

      expect(pipeline.rate).toHaveBeenCalledWith('old-1', 'up');
      await waitFor(() => expect(jobs.completeUpload).toHaveBeenCalled());
      expect(jobs.createJob).toHaveBeenCalledTimes(2);
      expect(screen.queryByTestId('rating-required')).not.toBeInTheDocument();
      expect(await screen.findByRole('heading', { name: /what's it for/i })).toBeVisible();
    });

    it('asks when the screen opens and shows the one-tap rating before any upload, then goes straight to the file', async () => {
      pipeline.pendingRatings.mockResolvedValue([
        { jobId: 'old-1', name: 'Hinge Pair', collectedAt: '2026-11-01T10:00:00Z' },
      ]);
      pipeline.rate.mockResolvedValue(createMockSnapshot());
      const { container } = render(<PrintFlow />);

      expect(await screen.findByTestId('rating-required')).toBeVisible();
      expect(screen.getByRole('heading', { name: /how did hinge pair turn out/i })).toBeVisible();
      // The file is not asked for until the rating is in
      expect(screen.queryByRole('heading', { name: '1. Your file' })).not.toBeInTheDocument();
      expect(screen.queryByText(/STL, STEP or 3MF/)).not.toBeInTheDocument();
      expect(jobs.createJob).not.toHaveBeenCalled();

      await setup().click(screen.getByRole('button', { name: 'Good' }));

      expect(pipeline.rate).toHaveBeenCalledWith('old-1', 'up');
      expect(await screen.findByRole('heading', { name: '1. Your file' })).toBeVisible();
      expect(screen.queryByTestId('rating-required')).not.toBeInTheDocument();
      // ...and then the upload goes ahead with no 409 in between
      await chooseFile(container);
      await waitFor(() => expect(jobs.completeUpload).toHaveBeenCalled());
      expect(jobs.createJob).toHaveBeenCalledTimes(1);
    });

    it('goes straight to the file when nothing is waiting for a rating', async () => {
      render(<PrintFlow />);

      await waitFor(() => expect(pipeline.pendingRatings).toHaveBeenCalledTimes(1));
      expect(screen.getByRole('heading', { name: '1. Your file' })).toBeVisible();
      expect(screen.queryByTestId('rating-required')).not.toBeInTheDocument();
    });

    it('falls back to the 409 when the look-ahead fails', async () => {
      pipeline.pendingRatings.mockRejectedValue(new Error('offline'));
      jobs.createJob
        .mockRejectedValueOnce(ratingRequired([{ jobId: 'old-1', name: 'Hinge Pair' }]))
        .mockResolvedValue({
          jobId: 'job-9',
          createdAt: '2026-11-04T10:00:00Z',
          fileId: 'file-9',
          uploadUrl: 'https://storage.example/upload',
          uploadExpiresIn: 900,
        });
      pipeline.rate.mockResolvedValue(createMockSnapshot());
      const { container } = render(<PrintFlow />);

      expect(screen.getByRole('heading', { name: '1. Your file' })).toBeVisible();
      await chooseFile(container);

      expect(await screen.findByTestId('rating-required')).toBeVisible();
      await setup().click(screen.getByRole('button', { name: 'Good' }));
      await waitFor(() => expect(jobs.completeUpload).toHaveBeenCalled());
    });

    it('has no way to skip it: the backend blocks the submission', async () => {
      jobs.createJob.mockRejectedValue(ratingRequired([{ jobId: 'old-1', name: 'Hinge Pair' }]));
      const { container } = render(<PrintFlow />);

      await chooseFile(container);

      await screen.findByTestId('rating-required');
      expect(screen.queryByRole('button', { name: /skip|not now/i })).not.toBeInTheDocument();
    });
  });
});
