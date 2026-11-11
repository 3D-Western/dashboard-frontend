import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlanChangedError, pipelineApi } from '@/api/client/pipeline';
import { trackPrintSubmitted } from '@/lib/analytics';
import { PipelineJobPanel } from './PipelineJobPanel';
import {
  createMockEvent,
  createMockLessonCard,
  createMockPickup,
  createMockPlan,
  createMockSnapshot,
  createMockStep,
} from '@test/utils/pipelineFactories';
import type { PipelineStreamEvent } from '@/types/pipeline';

vi.mock('@/api/client/pipeline', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/client/pipeline')>()),
  pipelineApi: {
    getState: vi.fn(),
    stream: vi.fn(),
    liveView: vi.fn(),
    liveViewFrame: vi.fn(),
    saveInputs: vi.fn(),
    confirm: vi.fn(),
    choose: vi.fn(),
    report: vi.fn(),
  },
}));

vi.mock('@/lib/analytics', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/analytics')>()),
  trackPrintSubmitted: vi.fn(),
}));

const api = vi.mocked(pipelineApi);
const setup = () => userEvent.setup({ pointerEventsCheck: 0 });

/** Keeps the live stream open so a test can push events into the screen. */
function openStream() {
  const handle: { emit: (event: PipelineStreamEvent) => void } = { emit: () => {} };
  api.stream.mockImplementation(
    (_jobId, { onOpen, onEvent, signal }) =>
      new Promise<void>((resolve) => {
        handle.emit = onEvent;
        onOpen?.();
        signal?.addEventListener('abort', () => resolve());
      }),
  );
  return handle;
}

beforeEach(() => {
  Object.values(api).forEach((fn) => fn.mockReset());
  api.saveInputs.mockResolvedValue(undefined);
  api.confirm.mockResolvedValue(undefined);
  api.choose.mockResolvedValue(undefined);
  vi.mocked(trackPrintSubmitted).mockClear();
  vi.unstubAllEnvs();
});

/** Plays the paced loading view to its end (it never ends before the analysis is really done). */
async function playLoading(ms = 40_000) {
  // In small steps, so React commits (and the loading view reads its props) between them
  for (let done = 0; done < ms; done += 500) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
  }
}

/** The story card on show (the others stay in the page, hidden, so links to them work). */
const shownCard = () => screen.getAllByTestId('story-card').find((c) => !c.hasAttribute('hidden'))!;

function useFakeClock() {
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
}

describe('Preparing your print', () => {
  it("shows the loading view with a status line, a learning card and what finished, never the pipeline's internals", async () => {
    api.getState.mockResolvedValue(
      createMockSnapshot({
        steps: [
          createMockStep({ step: 'screening.ai_pass', title: 'Asking the AI', state: 'done' }),
          createMockStep({
            step: 'intake.load_mesh',
            title: 'Reading the mesh',
            teaching: 'We read the triangles.',
            state: 'done',
          }),
          createMockStep({ step: 'checks.thin_walls', title: 'Thin walls', state: 'done' }),
          createMockStep({ step: 'tweaks.settings', title: 'Checking for useful setting tweaks' }),
        ],
      }),
    );
    openStream();
    render(<PipelineJobPanel jobId="job-1" />);

    expect(await screen.findByTestId('loading-view')).toBeInTheDocument();
    expect(screen.getByTestId('loading-status')).not.toBeEmpty();
    // The first finished plain check is a popup; the learning card is on the side
    expect(await screen.findByText('We read the triangles.')).toBeInTheDocument();
    expect(await screen.findByTestId('loading-card')).toBeInTheDocument();
    for (const hidden of ['Asking the AI', 'Thin walls', /setting tweaks/i, 'Reading the mesh']) {
      expect(screen.queryByText(hidden)).not.toBeInTheDocument();
    }
    expect(screen.getByTestId('loading-stage')).toHaveAttribute('data-viewer', 'plain'); // no WebGL in tests
    // Nothing is found yet, so there are no pins or findings
    expect(screen.queryByText('Found on your part')).not.toBeInTheDocument();
  });

  it('shows at most two popups, and a real finding with its number', async () => {
    useFakeClock();
    try {
      api.getState.mockResolvedValue(
        createMockSnapshot({
          steps: [
            createMockStep({ step: 'intake.load_mesh', state: 'done' }),
            createMockStep({
              step: 'checks.bodies',
              state: 'done',
              lesson: {
                code: 'pieces.several',
                title: 'Your file has two separate pieces',
                body: 'Each prints on its own.',
              },
            }),
            createMockStep({ step: 'checks.units', state: 'done' }),
          ],
        }),
      );
      openStream();
      render(<PipelineJobPanel jobId="job-1" />);
      await screen.findByTestId('loading-view');
      await playLoading(2000);
      await playLoading(3500);
      await playLoading(3500);
      await playLoading(6000);

      const popups = screen.getByTestId('loading-popups');
      expect(popups.querySelectorAll('li').length).toBeLessThanOrEqual(2);
      // ...and the finding was shown at some point, numbered 1
      const log = screen.getByRole('button', { name: /History/ });
      await setup().click(log);
      expect(
        await screen.findByText(/Found on your part: Your file has two separate pieces/),
      ).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('opens the one-line "Did you know" into its card, and History lists what was shown, a page at a time', async () => {
    api.getState.mockResolvedValue(
      createMockSnapshot({
        steps: [createMockStep({ step: 'intake.load_mesh', state: 'done' })],
      }),
    );
    openStream();
    const user = setup();
    render(<PipelineJobPanel jobId="job-1" />);
    await screen.findByTestId('loading-card');

    const view = screen.getByTestId('loading-view');
    expect(view).not.toHaveAttribute('data-dyopen');
    await user.click(screen.getByRole('button', { name: /did you know/i }));
    expect(view).toHaveAttribute('data-dyopen');
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(view).not.toHaveAttribute('data-dyopen');

    await user.click(screen.getByRole('button', { name: /history \(\d+\)/i }));
    expect(await screen.findByTestId('loading-history')).toHaveTextContent('Opening your file');
    expect(screen.queryByTestId('loading-card')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Back to the card' }));
    expect(screen.getByTestId('loading-card')).toBeInTheDocument();
  });

  it('says honestly that it is taking longer than usual, lets the student leave, and goes away with the plan (P-194)', async () => {
    useFakeClock();
    try {
      api.getState.mockResolvedValue(createMockSnapshot());
      const live = openStream();
      render(<PipelineJobPanel jobId="job-1" takingLongerAfter={{ stallMs: 60, totalMs: 5000 }} />);
      await screen.findByTestId('loading-view');

      const notice = await screen.findByTestId('taking-longer');
      expect(within(notice).getByText(/taking longer than usual/i)).toBeInTheDocument();
      expect(within(notice).getByText(/do not need to wait here/i)).toBeInTheDocument();
      expect(within(notice).getByRole('link', { name: 'Back to my jobs' })).toHaveAttribute(
        'href',
        '/dashboard/jobs',
      );
      expect(within(notice).getByRole('link', { name: 'Start another upload' })).toHaveAttribute(
        'href',
        '/dashboard/jobs/print/new',
      );
      expect(notice.textContent).not.toMatch(/review|screen|hold|crew|staff/i); // a held part looks like a slow one (P-43)

      live.emit(
        createMockEvent({
          seq: 1,
          type: 'plan',
          studentStatus: 'needs_confirmation',
          plan: createMockPlan(),
        }),
      );
      await playLoading();
      await screen.findByTestId('story-view');
      expect(screen.queryByTestId('taking-longer')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not say it is taking longer while steps keep arriving, until the total limit', async () => {
    api.getState.mockResolvedValue(createMockSnapshot());
    const live = openStream();
    render(<PipelineJobPanel jobId="job-1" takingLongerAfter={{ stallMs: 400, totalMs: 900 }} />);
    await screen.findByTestId('loading-view');
    for (let i = 1; i <= 3; i++) {
      await new Promise((r) => setTimeout(r, 200));
      act(() => {
        live.emit(
          createMockEvent({
            seq: i,
            step: createMockStep({ step: `slice.s${i}`, title: `s${i}`, state: 'done' }),
          }),
        );
      });
    }
    expect(screen.queryByTestId('taking-longer')).not.toBeInTheDocument(); // 600 ms in, last step 0 ms ago
    expect(await screen.findByTestId('taking-longer')).toBeInTheDocument(); // total limit passes
  });

  it('shows nothing extra for a normal wait', async () => {
    api.getState.mockResolvedValue(createMockSnapshot());
    openStream();
    render(<PipelineJobPanel jobId="job-1" />);
    await screen.findByTestId('loading-view');
    expect(screen.queryByTestId('taking-longer')).not.toBeInTheDocument();
  });

  it('ends only when the analysis is really done, then turns into the story in place', async () => {
    useFakeClock();
    try {
      api.getState.mockResolvedValue(createMockSnapshot());
      const live = openStream();
      render(<PipelineJobPanel jobId="job-1" />);
      await screen.findByTestId('loading-view');

      // Plenty of time passes, but the analysis is not done: still loading
      await playLoading(60_000);
      expect(screen.getByTestId('loading-view')).toBeInTheDocument();
      expect(screen.queryByTestId('story-view')).not.toBeInTheDocument();

      live.emit(
        createMockEvent({
          seq: 1,
          type: 'plan',
          studentStatus: 'needs_confirmation',
          plan: createMockPlan(),
        }),
      );
      await playLoading();

      expect(await screen.findByTestId('story-view')).toBeInTheDocument();
      expect(screen.queryByTestId('loading-view')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('offers a retry when the job cannot be loaded at all', async () => {
    api.getState.mockRejectedValue(new Error('offline'));
    api.stream.mockRejectedValue(new Error('offline'));
    render(<PipelineJobPanel jobId="job-1" retryBaseMs={5000} />);

    expect(await screen.findByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});

describe('The story and the summary', () => {
  const reviewSnapshot = (
    planOverrides = {},
    status: 'needs_confirmation' | 'needs_choice' = 'needs_confirmation',
  ) =>
    createMockSnapshot({ studentStatus: status, plan: createMockPlan(planOverrides), steps: [] });
  // A student who opens a job that is still in review gets the story at once.
  const renderStory = (status: 'needs_confirmation' | 'needs_choice' = 'needs_confirmation') =>
    render(<PipelineJobPanel jobId="job-1" initialStatus={status} actionRereadMs={20} />);
  const toSummary = async (user: ReturnType<typeof setup>) =>
    user.click(await screen.findByRole('button', { name: 'Skip to summary' }));

  it('steps through cards tagged by what they are, then the summary with time and grams', async () => {
    api.getState.mockResolvedValue(reviewSnapshot());
    openStream();
    const user = setup();
    renderStory();

    await screen.findByTestId('story-view');
    const first = shownCard();
    expect(within(first).getByText('Handled for you')).toBeInTheDocument();
    expect(within(first).getByText('We added supports under the arm')).toBeInTheDocument();
    expect(within(first).getByText('1 of 3')).toBeInTheDocument();
    // The second card is in the page (for links) but not shown until the student steps to it
    expect(document.getElementById('lesson-card-surface.minor_stringing')).toHaveAttribute(
      'hidden',
    );
    await user.click(within(first).getByRole('button', { name: 'Next' }));
    const second = shownCard();
    expect(within(second).getByText('Worth knowing')).toBeInTheDocument();
    expect(within(second).getByText('Small gaps may leave fine strings')).toBeInTheDocument();

    await user.click(within(second).getByRole('button', { name: 'Summary' }));
    const summary = screen.getByTestId('story-summary');
    expect(summary).toBeVisible();
    expect(within(summary).getByText('3 h 25 min · 42 g')).toBeInTheDocument();
    expect(within(summary).getByText('Handled for you')).toBeInTheDocument();
    expect(within(summary).getByText('Worth knowing')).toBeInTheDocument();
    expect(within(summary).getByRole('button', { name: 'Yes, print this' })).toBeEnabled();
    // The pipeline's preview image stands in until the 3D view is up
    expect(screen.getByAltText(/preview of your part/i)).toHaveAttribute('src', '/preview.png');
  });

  it('leaves out anything a staff hold marked: a held part looks like preparing to the student (P-43)', async () => {
    api.getState.mockResolvedValue(
      reviewSnapshot({
        lessonCards: [
          createMockLessonCard({ code: 'screen.hold', title: 'Needs a person', severity: 'hold' }),
          createMockLessonCard(),
        ],
      }),
    );
    openStream();
    renderStory();
    await screen.findByTestId('story-view');
    expect(screen.queryByText('Needs a person')).not.toBeInTheDocument();
  });

  it('keeps "Specify settings" in a dialog, prefilled with the pipeline choices and its reasons', async () => {
    api.getState.mockResolvedValue(reviewSnapshot());
    openStream();
    const user = setup();
    renderStory();
    await toSummary(user);
    await user.click(screen.getByRole('button', { name: /change print settings/i }));
    const trigger = await screen.findByRole('button', { name: /specify settings/i });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await user.click(trigger);

    expect(screen.getByRole('radio', { name: 'Standard' })).toBeChecked();
    expect(screen.getByRole('spinbutton', { name: /infill/i })).toHaveValue(25);
    const supports = screen.getByRole('radiogroup', { name: 'Supports' });
    expect(within(supports).getByRole('radio', { name: 'Auto' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /build plate only/i })).toBeChecked();
    const brim = screen.getByRole('radiogroup', { name: 'Brim' });
    expect(within(brim).getByRole('radio', { name: 'On' })).toBeChecked();
    expect(screen.getByText(/above the 15% default/)).toBeInTheDocument();
    expect(screen.getByText(/3MF project/)).toBeInTheDocument();
  });

  it('sends nothing to the farm until the explicit yes, quotes the plan it showed, and then says "Sent to print queue"', async () => {
    api.getState.mockResolvedValue(reviewSnapshot({ planId: 'plan-77' }));
    openStream();
    const user = setup();
    renderStory();
    await toSummary(user);
    expect(api.confirm).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Yes, print this' }));

    expect(api.confirm).toHaveBeenCalledWith('job-1', 'plan-77');
    expect(await screen.findByText('Sent to print queue')).toBeInTheDocument();
  });

  it('keeps "Sent to print queue" after the yes when the re-read finds nothing new (no flick back to the story)', async () => {
    api.getState.mockResolvedValue(reviewSnapshot({ planId: 'plan-1' }));
    openStream();
    const user = setup();
    renderStory();
    await toSummary(user);

    await user.click(screen.getByRole('button', { name: 'Yes, print this' }));
    await screen.findByText('Sent to print queue');
    await waitFor(() => expect(api.getState).toHaveBeenCalledTimes(1));
    await new Promise((resolve) => setTimeout(resolve, 80));

    expect(screen.getByText('Sent to print queue')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Yes, print this' })).not.toBeInTheDocument();
  });

  it('reads the job once more after an accepted yes, and shows the reason when the pipeline refused it later', async () => {
    api.getState.mockResolvedValueOnce(reviewSnapshot({ planId: 'plan-1' })).mockResolvedValue({
      ...reviewSnapshot({ planId: 'plan-1' }),
      message: 'We could not take your yes: the printer settings changed. Please look again.',
    });
    openStream();
    const user = setup();
    renderStory();
    await toSummary(user);

    await user.click(screen.getByRole('button', { name: 'Yes, print this' }));

    expect(await screen.findByText(/could not take your yes/i)).toBeInTheDocument();
    expect(api.getState).toHaveBeenCalledTimes(2);
  });

  it('counts the yes as the submitted print for the steps-to-submit metric, and a refused yes is not one', async () => {
    api.getState.mockResolvedValue(reviewSnapshot({ planId: 'plan-1' }));
    openStream();
    api.confirm.mockRejectedValueOnce(new PlanChangedError(createMockPlan({ planId: 'plan-2' })));
    const user = setup();
    renderStory();
    await toSummary(user);

    await user.click(screen.getByRole('button', { name: 'Yes, print this' }));
    await toSummary(user);
    await screen.findByRole('button', { name: 'Yes, print this updated plan' });
    expect(trackPrintSubmitted).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Yes, print this updated plan' }));
    await screen.findByText('Sent to print queue');
    expect(trackPrintSubmitted).toHaveBeenCalledTimes(1);
    expect(trackPrintSubmitted).toHaveBeenCalledWith('job-1');
  });

  it('on a 409 shows the changed plan and asks for a second yes', async () => {
    api.getState.mockResolvedValue(reviewSnapshot({ planId: 'plan-1' }));
    openStream();
    const changed = createMockPlan({
      planId: 'plan-2',
      summary: 'We found a better way to lay your part down.',
    });
    api.confirm.mockRejectedValueOnce(new PlanChangedError(changed));
    const user = setup();
    renderStory();
    await toSummary(user);

    await user.click(screen.getByRole('button', { name: 'Yes, print this' }));

    expect(
      await screen.findByText(/your plan changed while you were reading it/i),
    ).toBeInTheDocument();
    await toSummary(user);
    await user.click(screen.getByRole('button', { name: 'Yes, print this updated plan' }));
    expect(api.confirm).toHaveBeenLastCalledWith('job-1', 'plan-2');
    expect(await screen.findByText('Sent to print queue')).toBeInTheDocument();
  });

  const choicePlan = {
    planId: 'plan-3',
    answer: 'needs_choice' as const,
    lessonCards: [
      createMockLessonCard({
        code: 'orient.choice',
        title: 'How should we lay your part?',
        severity: 'choice' as const,
      }),
      createMockLessonCard(),
    ],
    choices: [
      {
        choiceId: 'orientation',
        question: 'How should we lay your part on the plate?',
        findingCodes: ['orient.choice'],
        options: [
          { optionId: 'flat', label: 'Lying flat', explanation: 'Sticks best.', recommended: true },
          { optionId: 'upright', label: 'Standing up', explanation: 'Stronger along the hook.' },
        ],
      },
    ],
  };

  it('puts a choice first, inline on its card, holds the next step and the yes until it is made, and sends the pick', async () => {
    api.getState.mockResolvedValue(reviewSnapshot(choicePlan, 'needs_choice'));
    openStream();
    const user = setup();
    renderStory('needs_choice');

    await screen.findByTestId('story-view');
    const card = shownCard();
    expect(within(card).getByText('Your choice')).toBeInTheDocument();
    expect(within(card).getByText('Pick one to continue')).toBeInTheDocument();
    expect(within(card).getByText('Recommended')).toBeInTheDocument();
    expect(within(card).getByText('Sticks best.')).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: 'Next' })).toBeDisabled();
    await user.click(within(card).getByRole('button', { name: 'Skip to summary' }));
    expect(screen.getByRole('button', { name: 'Yes, print this' })).toBeDisabled();
    expect(screen.getByText('Make your choice on the cards first.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Back to the story' }));
    await user.click(screen.getByRole('radio', { name: /standing up/i }));

    expect(api.choose).toHaveBeenCalledWith('job-1', {
      planId: 'plan-3',
      choiceId: 'orientation',
      optionId: 'upright',
    });
    // The summary says what was picked, and the yes opens
    await user.click(screen.getByRole('button', { name: 'Skip to summary' }));
    expect(
      within(screen.getByTestId('story-summary')).getByText('Standing up'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Yes, print this' })).toBeEnabled();
  });

  it('asks for an updated plan before the yes when the student changes a setting', async () => {
    api.getState.mockResolvedValue(reviewSnapshot());
    openStream();
    const user = setup();
    renderStory();
    await toSummary(user);
    await user.click(screen.getByRole('button', { name: /change print settings/i }));
    await user.click(await screen.findByRole('button', { name: /specify settings/i }));

    await user.click(screen.getByRole('radio', { name: 'Strong' }));
    await user.click(screen.getByRole('button', { name: 'Update my plan' }));

    await waitFor(() => expect(api.saveInputs).toHaveBeenCalled());
    expect(api.saveInputs).toHaveBeenCalledWith('job-1', {
      settings: {
        profile: 'strong',
        infillPercent: 25,
        supports: 'auto',
        supportsBuildPlateOnly: true,
        brim: 'on',
      },
    });
  });

  it('leaves a place for the 3D viewer, which the preview image fills for now', async () => {
    api.getState.mockResolvedValue(reviewSnapshot({ lessonCards: [createMockLessonCard()] }));
    openStream();
    const { container } = renderStory();
    await screen.findByTestId('story-view');

    const slot = container.querySelector('[data-slot="part-viewer"]');
    expect(slot).not.toBeNull();
    expect(slot).toHaveAttribute('data-viewer', 'preview');
  });

  it('says nothing needs a decision when the plan has nothing to tell', async () => {
    api.getState.mockResolvedValue(reviewSnapshot({ lessonCards: [], choices: [] }));
    openStream();
    renderStory();

    expect(await screen.findByTestId('story-summary')).toBeVisible();
    expect(screen.getByText('Nothing needs your decision.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Yes, print this' })).toBeEnabled();
  });
});

describe('Review straight from the server', () => {
  it('shows the story on the first paint when the server already read the snapshot', async () => {
    openStream();
    api.getState.mockImplementation(() => new Promise(() => {})); // never answers: not needed
    render(
      <PipelineJobPanel
        jobId="job-1"
        initialStatus="needs_confirmation"
        initialSnapshot={createMockSnapshot({
          studentStatus: 'needs_confirmation',
          plan: createMockPlan(),
          lastSeq: 9,
        })}
      />,
    );

    expect(screen.getByTestId('story-view')).toBeInTheDocument();
    expect(screen.queryByTestId('loading-view')).not.toBeInTheDocument();
    // The stream opens at once, after the snapshot's seq, without a second read first
    await waitFor(() => expect(api.stream).toHaveBeenCalled());
    expect(api.stream.mock.calls[0][1].lastSeq).toBe(9);
    expect(api.getState).not.toHaveBeenCalled();
  });

  it('holds the loading view, not a flash of anything else, while a review status waits for its plan', async () => {
    openStream();
    api.getState.mockImplementation(() => new Promise(() => {}));
    render(<PipelineJobPanel jobId="job-1" initialStatus="needs_confirmation" />);

    expect(screen.getByTestId('loading-view')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /yes, print this/i })).not.toBeInTheDocument();
  });
});

describe("Can't print", () => {
  it('says why and what to change', async () => {
    vi.stubEnv('NEXT_PUBLIC_JOB_CREATION_ENABLED', 'true');
    api.getState.mockResolvedValue(
      createMockSnapshot({
        studentStatus: 'cannot_print',
        plan: createMockPlan({
          answer: 'cannot_print',
          summary: 'The walls are thinner than our printers can make.',
          lessonCards: [
            createMockLessonCard({
              code: 'walls.too_thin',
              title: 'The walls are too thin',
              body: 'Make every wall at least 1.2 mm thick, then upload it again.',
              severity: 'cannot_print',
            }),
          ],
          printTimeS: null,
          filamentG: null,
        }),
      }),
    );
    openStream();
    render(<PipelineJobPanel jobId="job-1" />);

    expect(
      await screen.findByRole('heading', { name: /can't be printed as it is/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('The walls are thinner than our printers can make.'),
    ).toBeInTheDocument();
    expect(screen.getByText('What to change')).toBeInTheDocument();
    expect(screen.getByText(/at least 1.2 mm thick/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /upload a fixed file/i })).toHaveAttribute(
      'href',
      '/dashboard/jobs/print/new',
    );
    expect(screen.queryByRole('button', { name: /yes, print/i })).not.toBeInTheDocument();
  });
});

describe('After the yes', () => {
  it('words the status in plain language', async () => {
    api.getState.mockResolvedValue(
      createMockSnapshot({ studentStatus: 'reprinting', plan: createMockPlan() }),
    );
    openStream();
    render(<PipelineJobPanel jobId="job-1" />);

    expect(await screen.findByRole('heading', { name: 'Printing again' })).toBeInTheDocument();
    expect(screen.getByText(/you don't need to do anything/i)).toBeInTheDocument();
  });
});

describe('Ready for pickup', () => {
  it('shows the slot and tag with the preview', async () => {
    api.getState.mockResolvedValue(
      createMockSnapshot({
        studentStatus: 'ready_for_pickup',
        plan: createMockPlan(),
        pickup: createMockPickup(),
      }),
    );
    openStream();
    render(<PipelineJobPanel jobId="job-1" />);

    expect(await screen.findByRole('heading', { name: 'Slot 14, tag K7Q2' })).toBeInTheDocument();
    expect(screen.getByAltText('Your finished print')).toHaveAttribute('src', '/pickup.png');
    expect(screen.getByText(/yours to take until/i)).toBeInTheDocument();
  });

  it('picks up the slot from a pickup event on the stream', async () => {
    // The event makes the panel re-read the job (the rating card needs it), which now says the same.
    api.getState
      .mockResolvedValueOnce(createMockSnapshot({ studentStatus: 'printing' }))
      .mockResolvedValue(
        createMockSnapshot({
          studentStatus: 'ready_for_pickup',
          pickup: createMockPickup({ slot: '3', tag: 'ZZ99' }),
        }),
      );
    const live = openStream();
    render(<PipelineJobPanel jobId="job-1" />);
    await screen.findByRole('heading', { name: 'Printing' });
    // The stream opens just after the snapshot is shown; events sent before that would be lost.
    await waitFor(() => expect(api.stream).toHaveBeenCalled());

    act(() =>
      live.emit(
        createMockEvent({
          seq: 1,
          type: 'pickup',
          studentStatus: 'ready_for_pickup',
          pickup: createMockPickup({ slot: '3', tag: 'ZZ99' }),
        }),
      ),
    );

    expect(await screen.findByRole('heading', { name: 'Slot 3, tag ZZ99' })).toBeInTheDocument();
  });
});

describe('Ask why', () => {
  it.each([
    ['cannot_print', "a part that can't print"],
    ['collected', 'a closed job'],
    ['rejected', 'a rejected job'],
  ] as const)('is on screen for %s (%s), with Ask the crew', async (studentStatus, _why) => {
    api.getState.mockResolvedValue(createMockSnapshot({ studentStatus, plan: createMockPlan() }));
    openStream();
    render(<PipelineJobPanel jobId="job-1" />);

    const panel = await screen.findByTestId('disagree-panel');
    expect(within(panel).getByRole('button', { name: 'Ask the crew' })).toBeEnabled();
    expect(within(panel).getByLabelText('Your question')).toBeInTheDocument();
  });

  it.each(['needs_confirmation', 'needs_choice'] as const)(
    'is "Ask about this" on the story card for %s, with Ask the crew',
    async (studentStatus) => {
      api.getState.mockResolvedValue(createMockSnapshot({ studentStatus, plan: createMockPlan() }));
      openStream();
      const user = setup();
      render(<PipelineJobPanel jobId="job-1" initialStatus={studentStatus} />);

      expect(screen.queryByTestId('disagree-panel')).not.toBeInTheDocument();
      await user.click(await screen.findByRole('button', { name: 'Ask about this' }));

      const panel = await screen.findByTestId('disagree-panel');
      expect(within(panel).getByRole('button', { name: 'Ask the crew' })).toBeEnabled();
      expect(within(panel).getByLabelText('Your question')).toBeInTheDocument();
    },
  );

  it('is not shown while the part is still being prepared, or on the steps-only screen', async () => {
    api.getState.mockResolvedValue(createMockSnapshot({ studentStatus: 'preparing' }));
    openStream();
    const { unmount } = render(<PipelineJobPanel jobId="job-1" />);
    await screen.findByTestId('loading-view');
    expect(screen.queryByTestId('disagree-panel')).not.toBeInTheDocument();
    unmount();

    api.getState.mockResolvedValue(
      createMockSnapshot({ studentStatus: 'needs_confirmation', plan: createMockPlan() }),
    );
    render(<PipelineJobPanel jobId="job-1" stepsOnly />);
    await screen.findByTestId('loading-view');
    expect(screen.queryByTestId('disagree-panel')).not.toBeInTheDocument();
  });

  it('flags an answer about an earlier plan once the plan on screen has moved on', async () => {
    api.getState.mockResolvedValue(
      createMockSnapshot({
        studentStatus: 'needs_confirmation',
        plan: createMockPlan({ planId: 'plan-2' }),
      }),
    );
    openStream();
    vi.mocked(pipelineApi).disagree = vi.fn().mockResolvedValue({
      requestId: 'r',
      turn: 1,
      status: 'answered',
      answer: 'That was decided on your first plan.',
      askedAt: '2026-11-05T12:00:00Z',
      planId: 'plan-1',
    });
    const user = setup();
    render(<PipelineJobPanel jobId="job-1" initialStatus="needs_confirmation" />);

    await user.click(await screen.findByRole('button', { name: 'Ask about this' }));
    await user.type(await screen.findByLabelText('Your question'), 'Why?');
    await user.click(screen.getByRole('button', { name: 'Ask' }));

    expect(await screen.findByText(/earlier version of your plan/)).toBeInTheDocument();
  });
});

describe('Watch it print', () => {
  it('shows the control while the job prints and the snapshot says a live view is on', async () => {
    api.getState.mockResolvedValue(
      createMockSnapshot({ studentStatus: 'printing', liveView: true }),
    );
    openStream();
    render(<PipelineJobPanel jobId="job-1" />);

    expect(await screen.findByRole('button', { name: 'Watch it print' })).toBeInTheDocument();
  });

  it.each([
    ['the snapshot does not say it is on', { studentStatus: 'printing' as const }],
    ['it says it is off', { studentStatus: 'printing' as const, liveView: false }],
    ['the job is not on a printer', { studentStatus: 'queued' as const, liveView: true }],
    [
      'the print is waiting for pickup',
      { studentStatus: 'ready_for_pickup' as const, liveView: true },
    ],
  ])('hides the control when %s', async (_name, snapshot) => {
    api.getState.mockResolvedValue(createMockSnapshot(snapshot));
    openStream();
    render(<PipelineJobPanel jobId="job-1" />);
    await screen.findByTestId('pipeline-panel');

    expect(screen.queryByRole('button', { name: 'Watch it print' })).not.toBeInTheDocument();
  });

  it('shows the control for a reprint too', async () => {
    api.getState.mockResolvedValue(
      createMockSnapshot({ studentStatus: 'reprinting', liveView: true }),
    );
    openStream();
    render(<PipelineJobPanel jobId="job-1" />);

    expect(await screen.findByRole('button', { name: 'Watch it print' })).toBeInTheDocument();
  });

  it('asks nothing of the camera until the student presses the button', async () => {
    api.getState.mockResolvedValue(
      createMockSnapshot({ studentStatus: 'printing', liveView: true }),
    );
    openStream();
    render(<PipelineJobPanel jobId="job-1" />);
    await screen.findByRole('button', { name: 'Watch it print' });

    expect(api.liveView).not.toHaveBeenCalled();
    expect(screen.queryByTestId('watch-it-print')).not.toBeInTheDocument();
  });
});
