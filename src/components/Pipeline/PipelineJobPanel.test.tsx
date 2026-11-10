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

describe('Preparing your print', () => {
  it("shows only the plain checks as a gentle carousel, never the pipeline's internals", async () => {
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
    const live = openStream();
    render(<PipelineJobPanel jobId="job-1" />);

    expect(
      await screen.findByRole('heading', { name: 'Preparing your print' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Opening your file')).toBeInTheDocument();
    expect(screen.getByText('We read the triangles.')).toBeInTheDocument();
    for (const hidden of ['Asking the AI', 'Thin walls', /setting tweaks/i, 'Reading the mesh']) {
      expect(screen.queryByText(hidden)).not.toBeInTheDocument();
    }

    live.emit(
      createMockEvent({
        seq: 1,
        step: createMockStep({ step: 'verify.something', title: 'Verifying', state: 'started' }),
      }),
    );
    live.emit(
      createMockEvent({
        seq: 2,
        step: createMockStep({ step: 'checks.units', title: 'Units', state: 'done' }),
      }),
    );
    await waitFor(() => expect(screen.getByTestId('preparing-progress')).toBeInTheDocument());
    expect(screen.queryByText('Verifying')).not.toBeInTheDocument();
    expect(screen.getByText('Live')).toBeInTheDocument();
    expect(screen.getByTestId('preparing-stage')).toHaveAttribute('data-viewer', 'plain'); // no WebGL in tests
  });

  it('says honestly that it is taking longer than usual, lets the student leave, and goes away with the plan (P-194)', async () => {
    api.getState.mockResolvedValue(createMockSnapshot());
    const live = openStream();
    render(<PipelineJobPanel jobId="job-1" takingLongerAfter={{ stallMs: 60, totalMs: 5000 }} />);
    await screen.findByRole('heading', { name: 'Preparing your print' });

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
    await screen.findByRole('button', { name: /yes, print this/i });
    expect(screen.queryByTestId('taking-longer')).not.toBeInTheDocument();
  });

  it('does not say it is taking longer while steps keep arriving, until the total limit', async () => {
    api.getState.mockResolvedValue(createMockSnapshot());
    const live = openStream();
    render(<PipelineJobPanel jobId="job-1" takingLongerAfter={{ stallMs: 400, totalMs: 900 }} />);
    await screen.findByRole('heading', { name: 'Preparing your print' });
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
    await screen.findByRole('heading', { name: 'Preparing your print' });
    expect(screen.queryByTestId('taking-longer')).not.toBeInTheDocument();
  });

  it('turns into the review the moment the plan arrives', async () => {
    api.getState.mockResolvedValue(createMockSnapshot());
    const live = openStream();
    render(<PipelineJobPanel jobId="job-1" />);
    await screen.findByRole('heading', { name: 'Preparing your print' });

    live.emit(
      createMockEvent({
        seq: 1,
        type: 'plan',
        studentStatus: 'needs_confirmation',
        plan: createMockPlan(),
      }),
    );

    expect(await screen.findByRole('button', { name: 'Yes, print this' })).toBeInTheDocument();
  });

  it('offers a retry when the job cannot be loaded at all', async () => {
    api.getState.mockRejectedValue(new Error('offline'));
    api.stream.mockRejectedValue(new Error('offline'));
    render(<PipelineJobPanel jobId="job-1" retryBaseMs={5000} />);

    expect(await screen.findByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});

describe('Review', () => {
  const reviewSnapshot = (
    planOverrides = {},
    status: 'needs_confirmation' | 'needs_choice' = 'needs_confirmation',
  ) =>
    createMockSnapshot({ studentStatus: status, plan: createMockPlan(planOverrides), steps: [] });

  it('shows the answer, consequential cards first, the rest under "How your part was analysed", time and grams', async () => {
    api.getState.mockResolvedValue(reviewSnapshot());
    openStream();
    render(<PipelineJobPanel jobId="job-1" />);

    expect(
      await screen.findByRole('heading', { name: /print, with a few automatic adjustments/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/prints well lying on its back/)).toBeInTheDocument();

    // The consequential card is in the page; the other is hidden until the section opens
    const upFront = screen.getByRole('region', { name: 'What matters for your part' });
    expect(within(upFront).getByText('We added supports under the arm')).toBeInTheDocument();
    expect(screen.queryByText('Small gaps may leave fine strings')).not.toBeInTheDocument();
    await setup().click(screen.getByRole('button', { name: /how your part was analysed/i }));
    expect(await screen.findByText('Small gaps may leave fine strings')).toBeInTheDocument();

    expect(screen.getByText('3 h 25 min')).toBeInTheDocument();
    expect(screen.getByText('42 g')).toBeInTheDocument();
    expect(screen.getByAltText(/preview of your part/i)).toHaveAttribute('src', '/preview.png');
  });

  it('keeps "Specify settings" closed, prefilled with the pipeline choices and its reasons', async () => {
    api.getState.mockResolvedValue(reviewSnapshot());
    openStream();
    const user = setup();
    render(<PipelineJobPanel jobId="job-1" />);
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

  it('sends nothing to the farm until the explicit yes, and quotes the plan it showed', async () => {
    api.getState.mockResolvedValue(reviewSnapshot({ planId: 'plan-77' }));
    openStream();
    const user = setup();
    render(<PipelineJobPanel jobId="job-1" />);
    await screen.findByRole('button', { name: 'Yes, print this' });
    expect(api.confirm).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Yes, print this' }));

    expect(api.confirm).toHaveBeenCalledWith('job-1', 'plan-77');
    expect(await screen.findByRole('heading', { name: 'Queued' })).toBeInTheDocument();
  });

  it('keeps showing "Queued" after the yes when the re-read finds nothing new (no flick back to the review)', async () => {
    api.getState.mockResolvedValue(reviewSnapshot({ planId: 'plan-1' }));
    openStream();
    const user = setup();
    render(<PipelineJobPanel jobId="job-1" actionRereadMs={20} />);

    await user.click(await screen.findByRole('button', { name: 'Yes, print this' }));
    await screen.findByRole('heading', { name: 'Queued' });
    await waitFor(() => expect(api.getState).toHaveBeenCalledTimes(2));
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(screen.getByRole('heading', { name: 'Queued' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Yes, print this' })).not.toBeInTheDocument();
  });

  it('reads the job once more after an accepted yes, and shows the reason when the pipeline refused it later', async () => {
    api.getState.mockResolvedValueOnce(reviewSnapshot({ planId: 'plan-1' })).mockResolvedValue({
      ...reviewSnapshot({ planId: 'plan-1' }),
      message: 'We could not take your yes: the printer settings changed. Please look again.',
    });
    openStream();
    const user = setup();
    render(<PipelineJobPanel jobId="job-1" actionRereadMs={20} />);

    await user.click(await screen.findByRole('button', { name: 'Yes, print this' }));

    expect(await screen.findByText(/could not take your yes/i)).toBeInTheDocument();
    expect(api.getState).toHaveBeenCalledTimes(2);
  });

  it('counts the yes as the submitted print for the steps-to-submit metric, and a refused yes is not one', async () => {
    api.getState.mockResolvedValue(reviewSnapshot({ planId: 'plan-1' }));
    openStream();
    api.confirm.mockRejectedValueOnce(new PlanChangedError(createMockPlan({ planId: 'plan-2' })));
    const user = setup();
    render(<PipelineJobPanel jobId="job-1" />);

    await user.click(await screen.findByRole('button', { name: 'Yes, print this' }));
    await screen.findByRole('button', { name: 'Yes, print this updated plan' });
    expect(trackPrintSubmitted).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Yes, print this updated plan' }));
    await screen.findByRole('heading', { name: 'Queued' });
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
    render(<PipelineJobPanel jobId="job-1" />);

    await user.click(await screen.findByRole('button', { name: 'Yes, print this' }));

    expect(
      await screen.findByText(/your plan changed while you were reading it/i),
    ).toBeInTheDocument();
    expect(screen.getByText('We found a better way to lay your part down.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Yes, print this updated plan' }));
    expect(api.confirm).toHaveBeenLastCalledWith('job-1', 'plan-2');
    expect(await screen.findByRole('heading', { name: 'Queued' })).toBeInTheDocument();
  });

  it('shows a choice with its options, blocks the yes until it is answered, and sends the answer', async () => {
    api.getState.mockResolvedValue(
      reviewSnapshot(
        {
          planId: 'plan-3',
          answer: 'needs_choice',
          choices: [
            {
              choiceId: 'orientation',
              question: 'How should we lay your part on the plate?',
              options: [
                {
                  optionId: 'flat',
                  label: 'Lying flat',
                  explanation: 'Sticks best.',
                  recommended: true,
                },
                {
                  optionId: 'upright',
                  label: 'Standing up',
                  explanation: 'Stronger along the hook.',
                },
              ],
            },
          ],
        },
        'needs_choice',
      ),
    );
    openStream();
    const user = setup();
    render(<PipelineJobPanel jobId="job-1" />);

    expect(
      await screen.findByText('How should we lay your part on the plate?'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Yes, print this' })).toBeDisabled();
    expect(screen.getByText('Choose an option above first.')).toBeInTheDocument();
    expect(screen.getByText('Recommended')).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: /standing up/i }));

    expect(api.choose).toHaveBeenCalledWith('job-1', {
      planId: 'plan-3',
      choiceId: 'orientation',
      optionId: 'upright',
    });
  });

  it('asks for an updated plan before the yes when the student changes a setting', async () => {
    api.getState.mockResolvedValue(reviewSnapshot());
    openStream();
    const user = setup();
    render(<PipelineJobPanel jobId="job-1" />);
    await user.click(await screen.findByRole('button', { name: /specify settings/i }));

    await user.click(screen.getByRole('radio', { name: 'Strong' }));

    expect(screen.getByRole('button', { name: 'Yes, print this' })).toBeDisabled();
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
    const { container } = render(<PipelineJobPanel jobId="job-1" />);
    await screen.findByRole('button', { name: 'Yes, print this' });

    const slot = container.querySelector('[data-slot="part-viewer"]');
    expect(slot).not.toBeNull();
    expect(slot).toHaveAttribute('data-highlights', '1');
  });
});

describe('Review straight from the server', () => {
  it('shows the review on the first paint when the server already read the snapshot', async () => {
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

    expect(screen.getByRole('button', { name: 'Yes, print this' })).toBeInTheDocument();
    // The stream opens at once, after the snapshot's seq, without a second read first
    await waitFor(() => expect(api.stream).toHaveBeenCalled());
    expect(api.stream.mock.calls[0][1].lastSeq).toBe(9);
    expect(api.getState).not.toHaveBeenCalled();
  });

  it('holds a review skeleton, not the steps, while a review status waits for its plan', async () => {
    openStream();
    api.getState.mockImplementation(() => new Promise(() => {}));
    render(<PipelineJobPanel jobId="job-1" initialStatus="needs_confirmation" />);

    expect(screen.getByRole('status', { name: 'Loading your review' })).toBeInTheDocument();
    expect(screen.queryByText('Preparing your print')).not.toBeInTheDocument();
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
    ['needs_confirmation', 'a plan waiting for its yes'],
    ['needs_choice', 'a plan waiting for a choice'],
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

  it('is not shown while the part is still being prepared, or on the steps-only screen', async () => {
    api.getState.mockResolvedValue(createMockSnapshot({ studentStatus: 'preparing' }));
    openStream();
    const { unmount } = render(<PipelineJobPanel jobId="job-1" />);
    await screen.findByRole('heading', { name: 'Preparing your print' });
    expect(screen.queryByTestId('disagree-panel')).not.toBeInTheDocument();
    unmount();

    api.getState.mockResolvedValue(
      createMockSnapshot({ studentStatus: 'needs_confirmation', plan: createMockPlan() }),
    );
    render(<PipelineJobPanel jobId="job-1" stepsOnly />);
    await screen.findByRole('heading', { name: 'Preparing your print' });
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
    render(<PipelineJobPanel jobId="job-1" />);

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
