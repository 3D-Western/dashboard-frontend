import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

    expect(screen.getByText('Drop your 3D model here')).toBeInTheDocument();
    expect(screen.queryByText(/what is this print for/i)).not.toBeInTheDocument();
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

  it('uploads at once, in the background, then asks what the print is for on the intake card', async () => {
    const { container } = render(<PrintFlow />);

    await chooseFile(container);

    // Nothing was typed yet and the upload already ran end to end
    await waitFor(() => expect(jobs.completeUpload).toHaveBeenCalled());
    expect(jobs.createJob).toHaveBeenCalledWith(
      expect.objectContaining({ jobName: 'robot-arm-gear', category: 'ThreeDPrint' }),
    );
    // The student's own words come later, through the pipeline inputs: no placeholder text
    expect(jobs.createJob.mock.calls[0][0]).not.toHaveProperty('description');
    expect(jobs.completeUpload).toHaveBeenCalledWith(
      'job-9',
      expect.objectContaining({ fileName: 'robot-arm-gear.stl', checksum: 'sha256:test' }),
    );
    expect(screen.getByText(/what is this print for/i)).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /tell us about it/i })).toBeInTheDocument();
    expect(await screen.findByText('Uploaded. We are already checking it.')).toBeInTheDocument();
    // The pipeline is followed in the background; nothing of it shows until Continue
    await waitFor(() => expect(pipeline.getState).toHaveBeenCalledWith('job-9', expect.anything()));
    expect(screen.queryByTestId('loading-view')).not.toBeInTheDocument();
  });

  it('offers the five purposes, the venture first with its "No usage limits" tag, and never "something else"', async () => {
    const user = setup();
    const { container } = render(<PrintFlow />);
    await chooseFile(container);

    const radios = await screen.findAllByRole('radio');
    expect(radios.map((r) => r.textContent?.split(/(?=[A-Z][a-z]+ [a-z])/)[0])).toHaveLength(5);
    expect(screen.getByRole('radio', { name: /^Startup \/ venture/ })).toHaveTextContent(
      'No usage limits',
    );
    for (const name of [/^Class/, /^Club or student team/, /^Research/, /^Personal/]) {
      expect(screen.getByRole('radio', { name })).toBeInTheDocument();
    }
    expect(screen.queryByRole('radio', { name: /something else/i })).not.toBeInTheDocument();
    // Nothing is chosen for the student
    expect(radios.every((r) => r.getAttribute('aria-checked') === 'false')).toBe(true);

    await user.click(screen.getByRole('radio', { name: /^Startup \/ venture/ }));
    expect(screen.getByText("Venture prints don't count toward your usage limit.")).toBeVisible();
    expect(screen.getByLabelText('Venture name')).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: /^Personal/ }));
    // Personal has no extra field and no venture note
    expect(screen.queryByLabelText('Venture name')).not.toBeInTheDocument();
    expect(screen.queryByText(/don't count toward/i)).not.toBeInTheDocument();
  });

  it('saves the purpose as soon as it is picked, then the student’s own words once they stop typing', async () => {
    const user = setup();
    const { container } = render(<PrintFlow />);
    await chooseFile(container);
    await waitFor(() => expect(jobs.completeUpload).toHaveBeenCalled());

    await user.click(screen.getByRole('radio', { name: /^Class/ }));
    await user.type(screen.getByLabelText('Course code'), 'MME 4499');
    await waitFor(() =>
      expect(pipeline.saveInputs).toHaveBeenLastCalledWith('job-9', {
        purpose: 'class',
        purposeDetails: { course: 'MME 4499' },
      }),
    );

    const words = screen.getByRole('textbox', { name: /tell us about it/i });
    expect(words).toHaveValue('');
    await user.type(words, 'A replacement gear for my robot arm');
    // Saved in the background after the pause, without Continue
    await waitFor(
      () =>
        expect(pipeline.saveInputs).toHaveBeenLastCalledWith('job-9', {
          purpose: 'class',
          purposeDetails: { course: 'MME 4499' },
          description: 'A replacement gear for my robot arm',
        }),
      { timeout: 5000 },
    );
    expect(await screen.findByText('Saved')).toBeInTheDocument();
  });

  it('saves the words at once when the student leaves the field', async () => {
    const user = setup();
    const { container } = render(<PrintFlow />);
    await chooseFile(container);
    await waitFor(() => expect(jobs.completeUpload).toHaveBeenCalled());
    await user.click(screen.getByRole('radio', { name: /^Personal/ }));

    await user.type(screen.getByRole('textbox', { name: /tell us about it/i }), 'A desk hook');
    await user.tab();

    await waitFor(() =>
      expect(pipeline.saveInputs).toHaveBeenLastCalledWith(
        'job-9',
        expect.objectContaining({ purpose: 'personal', description: 'A desk hook' }),
      ),
    );
  });

  describe('Continue', () => {
    it('opens only when the answers are valid, and collapses the intake to a line the student can reopen and edit', async () => {
      const user = setup();
      const { container } = render(<PrintFlow />);
      await chooseFile(container);
      const cont = await screen.findByRole('button', { name: 'Continue' });
      expect(cont).toBeDisabled();

      await user.click(screen.getByRole('radio', { name: /^Class/ }));
      await user.type(screen.getByRole('textbox', { name: /tell us about it/i }), 'A gear');
      // a class needs its course code
      expect(cont).toBeDisabled();
      await user.type(screen.getByLabelText('Course code'), 'MME 2202');
      expect(cont).toBeEnabled();

      await user.click(cont);

      // The part comes forward into the loading view; the intake is a one-line summary
      expect(await screen.findByTestId('loading-view')).toBeInTheDocument();
      const line = screen.getByTestId('intake-summary');
      expect(line).toHaveTextContent('robot-arm-gear.stl');
      expect(line).toHaveTextContent('Class');
      expect(line).toHaveTextContent('MME 2202');
      expect(line).toHaveTextContent('A gear');
      expect(screen.queryByRole('button', { name: 'Continue' })).not.toBeInTheDocument();

      // Editing is still possible: the summary opens the answers again
      await user.click(line);
      const words = await screen.findByRole('textbox', { name: /tell us about it/i });
      expect(words).toHaveValue('A gear');
      pipeline.saveInputs.mockClear();
      await user.type(words, ' for my robot');
      await user.tab();
      await waitFor(() =>
        expect(pipeline.saveInputs).toHaveBeenLastCalledWith(
          'job-9',
          expect.objectContaining({ description: 'A gear for my robot' }),
        ),
      );
    });

    it('does not need the Personal purpose to name anything', async () => {
      const user = setup();
      const { container } = render(<PrintFlow />);
      await chooseFile(container);
      await user.click(await screen.findByRole('radio', { name: /^Personal/ }));
      await user.type(screen.getByRole('textbox', { name: /tell us about it/i }), 'A desk hook');
      expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled();
    });
  });

  it('tells the student at once, before Continue, when the part cannot be printed, and closes the intake', async () => {
    pipeline.getState.mockResolvedValue(
      createMockSnapshot({
        studentStatus: 'cannot_print',
        plan: createMockPlan({
          answer: 'cannot_print',
          summary: 'The part is too big for every printer.',
        }),
      }),
    );
    const { container } = render(<PrintFlow />);
    await chooseFile(container);

    expect(await screen.findByText(/can't be printed as it is/i)).toBeInTheDocument();
    expect(screen.getByText('The part is too big for every printer.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Continue' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('intake')).not.toBeInTheDocument();
  });

  describe('Recent answers', () => {
    async function answerOnce(purposeName: RegExp, field: string | null, value: string) {
      const user = setup();
      const first = render(<PrintFlow />);
      await chooseFile(first.container);
      await user.click(await screen.findByRole('radio', { name: purposeName }));
      if (field) await user.type(screen.getByLabelText(field), value);
      await user.type(screen.getByRole('textbox', { name: /tell us about it/i }), 'A thing');
      await user.click(screen.getByRole('button', { name: 'Continue' }));
      first.unmount();
      return user;
    }

    it('offers past answers in the Recent pill, and never fills anything in by itself', async () => {
      await answerOnce(/^Club or student team/, 'Club or team name', 'Robotics Club');
      const user = setup();
      const second = render(<PrintFlow />);
      await chooseFile(second.container);

      // Nothing is chosen or typed
      const radios = await screen.findAllByRole('radio');
      expect(radios.every((r) => r.getAttribute('aria-checked') === 'false')).toBe(true);
      expect(screen.getByRole('textbox', { name: /tell us about it/i })).toHaveValue('');
      expect(screen.queryByLabelText('Club or team name')).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /recent/i }));
      expect(screen.getByText('Nothing is filled until you tap one.')).toBeInTheDocument();
      await user.click(
        screen.getByRole('menuitem', { name: /Club or student team.*Robotics Club/ }),
      );

      // Tapping fills the purpose and the name, not the description
      expect(screen.getByRole('radio', { name: /^Club or student team/ })).toBeChecked();
      expect(screen.getByLabelText('Club or team name')).toHaveValue('Robotics Club');
      expect(screen.getByRole('textbox', { name: /tell us about it/i })).toHaveValue('');
    });

    it('has no Recent pill for a first-time student', async () => {
      const { container } = render(<PrintFlow />);
      await chooseFile(container);
      await screen.findAllByRole('radio');
      expect(screen.queryByRole('button', { name: /recent/i })).not.toBeInTheDocument();
    });

    it('lists the past answers of a field when it is focused, and fills only the one tapped', async () => {
      await answerOnce(/^Class/, 'Course code', 'MME 2202');
      const user = setup();
      const second = render(<PrintFlow />);
      await chooseFile(second.container);
      await user.click(await screen.findByRole('radio', { name: /^Class/ }));
      const field = screen.getByLabelText('Course code');
      expect(field).toHaveValue('');

      await user.click(field);
      await user.click(await screen.findByRole('option', { name: 'MME 2202' }));

      expect(field).toHaveValue('MME 2202');
    });
  });

  describe('the story and the yes', () => {
    /** Fills the intake, presses Continue and plays the loading view to its end. */
    async function reachStory() {
      vi.useFakeTimers({
        shouldAdvanceTime: true,
        toFake: [
          'setTimeout',
          'clearTimeout',
          'setInterval',
          'clearInterval',
          'Date',
          'requestAnimationFrame',
          'cancelAnimationFrame',
          'performance',
        ],
      });
      pipeline.getState.mockResolvedValue(
        createMockSnapshot({ studentStatus: 'needs_confirmation', plan: createMockPlan() }),
      );
      const user = userEvent.setup({
        pointerEventsCheck: 0,
        advanceTimers: vi.advanceTimersByTime,
      });
      const { container } = render(<PrintFlow />);
      await chooseFile(container);
      await user.click(await screen.findByRole('radio', { name: /^Personal/ }));
      await user.type(screen.getByRole('textbox', { name: /tell us about it/i }), 'A desk hook');
      await user.tab();
      await vi.advanceTimersByTimeAsync(1000);
      await user.click(screen.getByRole('button', { name: 'Continue' }));
      // The loading view never ends before the analysis is really done, then it is read at a calm pace
      expect(screen.getByTestId('loading-view')).toBeInTheDocument();
      await vi.advanceTimersByTimeAsync(40_000);
      return user;
    }

    afterEach(() => {
      vi.useRealTimers();
    });

    it('turns the loading view into the story in place once the analysis is really done, with no menu in between', async () => {
      await reachStory();

      expect(await screen.findByTestId('story-view')).toBeInTheDocument();
      expect(screen.queryByTestId('loading-view')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Skip to summary' })).toBeInTheDocument();
    });

    it('keeps the yes waiting while an edit is being saved, and does not go back to loading', async () => {
      const user = await reachStory();
      await user.click(await screen.findByRole('button', { name: 'Skip to summary' }));
      expect(await screen.findByRole('button', { name: /yes, print this/i })).toBeEnabled();
      pipeline.saveInputs.mockClear();

      await user.click(screen.getByTestId('intake-summary'));
      await user.type(screen.getByRole('textbox', { name: /tell us about it/i }), ' on a wall');

      // Not back to the loading view: the story is still there, its yes waiting for the save
      expect(screen.queryByTestId('loading-view')).not.toBeInTheDocument();
      await user.tab();
      await vi.advanceTimersByTimeAsync(500);
      await waitFor(() =>
        expect(pipeline.saveInputs).toHaveBeenLastCalledWith(
          'job-9',
          expect.objectContaining({ description: 'A desk hook on a wall' }),
        ),
      );
    });

    it('says "Sent to print queue" after the yes, locks the answers and saves nothing more', async () => {
      const user = await reachStory();
      pipeline.confirm.mockResolvedValue(undefined);
      await user.click(await screen.findByRole('button', { name: 'Skip to summary' }));
      await user.click(await screen.findByRole('button', { name: /yes, print this/i }));

      expect(await screen.findByText('Sent to print queue')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'View this job' })).toBeInTheDocument();
      // the sent screen stands alone, centred: the intake's one-line summary goes
      expect(screen.queryByTestId('intake-summary')).not.toBeInTheDocument();
      pipeline.saveInputs.mockClear();
      expect(pipeline.confirm).toHaveBeenCalledWith('job-9', 'plan-1');
      expect(pipeline.saveInputs).not.toHaveBeenCalled();
    });

    it('treats a 409 on saving the answers as "already sent", not as a changed plan or a save error', async () => {
      const user = await reachStory();
      pipeline.saveInputs.mockRejectedValue(new ApiError('CONFLICT', 'The job is closed'));

      await user.click(await screen.findByTestId('intake-summary'));
      await user.type(screen.getByRole('textbox', { name: /tell us about it/i }), ' now');
      await user.tab();
      await vi.advanceTimersByTimeAsync(500);

      await waitFor(() =>
        expect(screen.getByRole('textbox', { name: /tell us about it/i })).toBeDisabled(),
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
        await user.click(await screen.findByRole('radio', { name: /^Personal/ }));
        await vi.advanceTimersByTimeAsync(800);
        const words = screen.getByRole('textbox', { name: /tell us about it/i });
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
        await user.click(await screen.findByRole('radio', { name: /^Personal/ }));
        await vi.advanceTimersByTimeAsync(800);
        pipeline.saveInputs.mockClear();
        pipeline.saveInputs.mockRejectedValueOnce(new ApiError('RATE_LIMIT_EXCEEDED', 'Slow down'));

        await user.type(screen.getByRole('textbox', { name: /tell us about it/i }), 'A desk hook');
        await user.tab();
        await vi.advanceTimersByTimeAsync(100);
        expect(pipeline.saveInputs).toHaveBeenCalledTimes(1);
        expect(screen.queryByText(/couldn.t save your answers/i)).not.toBeInTheDocument();
        await vi.advanceTimersByTimeAsync(31_000);
        await vi.advanceTimersByTimeAsync(200); // the retry re-renders, then saves
        expect(pipeline.saveInputs).toHaveBeenCalledTimes(2);
      } finally {
        vi.useRealTimers();
      }
    });
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

    expect(await screen.findByText('The upload did not finish.')).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: 'Try again' }));
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
      expect(screen.queryByText(/what is this print for/i)).not.toBeInTheDocument();

      await setup().click(screen.getByRole('button', { name: 'Good' }));

      expect(pipeline.rate).toHaveBeenCalledWith('old-1', 'up');
      await waitFor(() => expect(jobs.completeUpload).toHaveBeenCalled());
      expect(jobs.createJob).toHaveBeenCalledTimes(2);
      expect(screen.queryByTestId('rating-required')).not.toBeInTheDocument();
      expect(await screen.findByText(/what is this print for/i)).toBeVisible();
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
      expect(screen.queryByText('Drop your 3D model here')).not.toBeInTheDocument();
      expect(screen.queryByText(/STL, STEP or 3MF/)).not.toBeInTheDocument();
      expect(jobs.createJob).not.toHaveBeenCalled();

      await setup().click(screen.getByRole('button', { name: 'Good' }));

      expect(pipeline.rate).toHaveBeenCalledWith('old-1', 'up');
      expect(await screen.findByText('Drop your 3D model here')).toBeVisible();
      expect(screen.queryByTestId('rating-required')).not.toBeInTheDocument();
      // ...and then the upload goes ahead with no 409 in between
      await chooseFile(container);
      await waitFor(() => expect(jobs.completeUpload).toHaveBeenCalled());
      expect(jobs.createJob).toHaveBeenCalledTimes(1);
    });

    it('goes straight to the file when nothing is waiting for a rating', async () => {
      render(<PrintFlow />);

      await waitFor(() => expect(pipeline.pendingRatings).toHaveBeenCalledTimes(1));
      expect(screen.getByText('Drop your 3D model here')).toBeVisible();
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

      expect(screen.getByText('Drop your 3D model here')).toBeVisible();
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
