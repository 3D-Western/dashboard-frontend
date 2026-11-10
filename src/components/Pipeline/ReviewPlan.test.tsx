import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { pipelineApi } from '@/api/client/pipeline';
import { createMockPlan } from '@test/utils/pipelineFactories';
import type { Choice } from '@/types/pipeline';
import { ReviewPlan } from './ReviewPlan';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock('@/lib/analytics', () => ({ trackScreen: vi.fn() }));
vi.mock('@/api/client/pipeline', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/client/pipeline')>()),
  pipelineApi: { choose: vi.fn(), confirm: vi.fn(), saveInputs: vi.fn() },
}));
// The real viewer needs WebGL; this one only lays out what ReviewPlan composes on and beside it.
vi.mock('./PartViewerSlot', () => ({
  PartViewerSlot: ({
    compose,
  }: {
    compose?: (context: { ready: boolean; drawn: []; heights: Record<string, never> }) => {
      strip?: React.ReactNode;
      below?: React.ReactNode;
      panel?: React.ReactNode;
    };
  }) => {
    const view = compose?.({ ready: false, drawn: [], heights: {} });
    return (
      <>
        {view?.strip}
        {view?.panel}
        {view?.below}
      </>
    );
  },
}));

const api = vi.mocked(pipelineApi);
const choice = (choiceId: string): Choice => ({
  choiceId,
  question: `Question ${choiceId}`,
  options: [
    { optionId: 'a', label: `${choiceId} A`, explanation: 'x' },
    { optionId: 'b', label: `${choiceId} B`, explanation: 'y' },
  ],
});
const planWith = (planId: string, ids: string[]) =>
  createMockPlan({ planId, answer: 'needs_choice', choices: ids.map(choice) });

function view(jobId: string, planId: string, ids: string[]) {
  return (
    <ReviewPlan
      key={planId}
      jobId={jobId}
      plan={planWith(planId, ids)}
      studentStatus="needs_choice"
      onConfirmed={vi.fn()}
      onPlanChanged={vi.fn()}
      onStudentChange={vi.fn()}
    />
  );
}

beforeEach(() => {
  api.choose.mockReset().mockResolvedValue(undefined);
});

describe('ReviewPlan choices', () => {
  it('opens the yes as soon as every choice on screen has a pick, with no extra confirm', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    render(view('job-a', 'p1', ['one', 'two']));
    const yes = screen.getByRole('button', { name: 'Yes, print this' });

    // The choice for the open step is beside the viewer; "Needs you" opens the others.
    await user.click(screen.getByRole('radio', { name: /one A/ }));
    expect(yes).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /Question two/ }));
    await user.click(screen.getByRole('radio', { name: /two B/ }));

    await waitFor(() => expect(yes).toBeEnabled());
  });

  it('keeps the picks on the other cards when a new plan replaces the old one', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const { rerender } = render(view('job-b', 'p1', ['one', 'two', 'three']));
    await user.click(screen.getByRole('radio', { name: /one A/ }));
    await user.click(screen.getByRole('button', { name: /Question two/ }));
    await user.click(screen.getByRole('radio', { name: /two B/ }));
    await waitFor(() => expect(api.choose).toHaveBeenCalledTimes(2));

    // The new plan has a new id (the component remounts) and the answered card is gone.
    rerender(view('job-b', 'p2', ['two', 'three']));

    expect(screen.queryByRole('button', { name: /Question one/ })).not.toBeInTheDocument();
    // The pick on the card that is still there is remembered, and shown as done in the strip.
    expect(
      within(screen.getByRole('button', { name: /Question two/ })).getByLabelText('Picked'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Question two/ }));
    expect(screen.getByRole('radio', { name: /two B/ })).toBeChecked();
    await user.click(screen.getByRole('button', { name: /Question three/ }));
    expect(screen.getByRole('radio', { name: /three A/ })).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Yes, print this' })).toBeDisabled();

    await user.click(screen.getByRole('radio', { name: /three A/ }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Yes, print this' })).toBeEnabled(),
    );
  });
});

describe('ReviewPlan beside the viewer', () => {
  const card = (code: string, title: string, over = {}) => ({
    code,
    title,
    body: `${title} body`,
    severity: 'choice' as const,
    region: null,
    consequential: true,
    ...over,
  });

  it('puts a lesson and the choice it needs in the panel, and steps through them with arrows', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const plan = createMockPlan({
      planId: 'p9',
      answer: 'needs_choice',
      lessonCards: [
        card('pieces', 'Several pieces'),
        card('tidy', 'Tidy base', { severity: 'info', consequential: false }),
      ],
      choices: [{ ...choice('split'), findingCodes: ['pieces'] }],
    });
    render(
      <ReviewPlan
        jobId="job-c"
        plan={plan}
        studentStatus="needs_choice"
        onConfirmed={vi.fn()}
        onPlanChanged={vi.fn()}
        onStudentChange={vi.fn()}
      />,
    );

    const panel = screen.getByRole('complementary', { name: 'About this part' });
    expect(within(panel).getByText('Several pieces body')).toBeInTheDocument();
    expect(within(panel).getByRole('radio', { name: /split A/ })).toBeInTheDocument();
    expect(screen.queryByText(/How your part was analysed/)).not.toBeInTheDocument();
    // Every lesson keeps its element, whichever one is open
    expect(document.getElementById('lesson-card-pieces')).not.toBeNull();
    expect(document.getElementById('lesson-card-tidy')).not.toBeNull();

    await user.click(within(panel).getByRole('button', { name: 'Next' }));
    expect(within(panel).getByText('Tidy base body')).toBeInTheDocument();
    expect(within(panel).queryByRole('radio')).toBeNull();
    expect(within(panel).getByText('2 of 2')).toBeInTheDocument();
  });

  it('says so when nothing needs the student', () => {
    render(
      <ReviewPlan
        jobId="job-d"
        plan={createMockPlan({ planId: 'p10', choices: [] })}
        studentStatus="needs_confirmation"
        onConfirmed={vi.fn()}
        onPlanChanged={vi.fn()}
        onStudentChange={vi.fn()}
      />,
    );
    expect(screen.getByText('Nothing needs your decision.')).toBeInTheDocument();
  });
});
