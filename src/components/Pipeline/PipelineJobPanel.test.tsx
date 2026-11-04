import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlanChangedError, pipelineApi } from '@/api/client/pipeline';
import { PipelineJobPanel } from './PipelineJobPanel';
import {
  createMockEvent,
  createMockLessonCard,
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
    saveInputs: vi.fn(),
    confirm: vi.fn(),
    choose: vi.fn(),
    report: vi.fn(),
  },
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
});

describe('Preparing your print', () => {
  it('lists each step with its teaching line as it streams in', async () => {
    api.getState.mockResolvedValue(
      createMockSnapshot({
        steps: [
          createMockStep({
            step: 'a',
            title: 'Checking your file',
            teaching: 'We look for holes.',
          }),
        ],
      }),
    );
    const live = openStream();
    render(<PipelineJobPanel jobId="job-1" />);

    expect(
      await screen.findByRole('heading', { name: 'Preparing your print' }),
    ).toBeInTheDocument();
    expect(screen.getByText('We look for holes.')).toBeInTheDocument();

    live.emit(
      createMockEvent({
        seq: 1,
        step: createMockStep({
          step: 'b',
          title: 'Measuring your part',
          teaching: 'Thin walls decide how it prints.',
          state: 'started',
        }),
      }),
    );

    expect(await screen.findByText('Measuring your part')).toBeInTheDocument();
    expect(screen.getByText('Thin walls decide how it prints.')).toBeInTheDocument();
    expect(screen.getByText('Live')).toBeInTheDocument();
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

describe("Can't print", () => {
  it('says why and what to change', async () => {
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
