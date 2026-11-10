import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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
vi.mock('./PartViewerSlot', () => ({ PartViewerSlot: () => null }));

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

    await user.click(screen.getByRole('radio', { name: /one A/ }));
    expect(yes).toBeDisabled();
    await user.click(screen.getByRole('radio', { name: /two B/ }));

    await waitFor(() => expect(yes).toBeEnabled());
  });

  it('keeps the picks on the other cards when a new plan replaces the old one', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const { rerender } = render(view('job-b', 'p1', ['one', 'two', 'three']));
    await user.click(screen.getByRole('radio', { name: /one A/ }));
    await user.click(screen.getByRole('radio', { name: /two B/ }));
    await waitFor(() => expect(api.choose).toHaveBeenCalledTimes(2));

    // The new plan has a new id (the component remounts) and the answered card is gone.
    rerender(view('job-b', 'p2', ['two', 'three']));

    expect(screen.queryByText('Question one')).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /two B/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /three A/ })).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Yes, print this' })).toBeDisabled();

    await user.click(screen.getByRole('radio', { name: /three A/ }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Yes, print this' })).toBeEnabled(),
    );
  });
});
