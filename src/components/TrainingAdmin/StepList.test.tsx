import { describe, it, expect, vi, type Mock } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@/api/client/errors';
import { trainingAdminAPI } from '@/api/client/training-admin';
import { createAdminStep, createVersionDetail } from '@test/utils/trainingAdminFactories';
import type { AdminStep } from '@/types/training-admin';
import { StepList } from './StepList';

vi.mock('@/api/client/training-admin', () => ({
  trainingAdminAPI: { reorderSteps: vi.fn(), deleteStep: vi.fn() },
}));

const api = trainingAdminAPI as unknown as { reorderSteps: Mock; deleteStep: Mock };

const steps: AdminStep[] = [
  createAdminStep({ id: 11, position: 1, type: 'VIDEO', title: 'Meet the machine' }),
  createAdminStep({ id: 12, position: 2, type: 'READING', title: 'Safe operation' }),
  createAdminStep({ id: 13, position: 3, type: 'QUIZ', title: 'Final quiz', bodyMarkdown: null }),
];

function setup(props: { issues?: { path: string; message: string }[] } = {}) {
  const onEdit = vi.fn();
  const onReordered = vi.fn();
  const onDeleted = vi.fn();
  render(
    <StepList
      versionId={100}
      steps={steps}
      issues={props.issues ?? []}
      onEdit={onEdit}
      onReordered={onReordered}
      onDeleted={onDeleted}
    />,
  );
  return { onEdit, onReordered, onDeleted };
}

describe('StepList reordering', () => {
  it('moves a step down by sending every step id in the new order', async () => {
    const reordered = createVersionDetail([steps[1], steps[0], steps[2]]);
    api.reorderSteps.mockResolvedValue(reordered);
    const { onReordered } = setup();

    await userEvent.click(screen.getByRole('button', { name: 'Move step 1 down' }));

    expect(api.reorderSteps).toHaveBeenCalledWith(100, [12, 11, 13]);
    await waitFor(() => expect(onReordered).toHaveBeenCalledWith(reordered));
  });

  it('moves a step up', async () => {
    api.reorderSteps.mockResolvedValue(createVersionDetail(steps));
    setup();

    await userEvent.click(screen.getByRole('button', { name: 'Move step 3 up' }));

    expect(api.reorderSteps).toHaveBeenCalledWith(100, [11, 13, 12]);
  });

  it('cannot move the first step up or the last step down', () => {
    setup();

    expect(screen.getByRole('button', { name: 'Move step 1 up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move step 3 down' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move step 2 up' })).toBeEnabled();
  });

  it('keeps the order and says so when the server refuses', async () => {
    api.reorderSteps.mockRejectedValue(new ApiError('CONFLICT', 'Only a draft can be edited'));
    const { onReordered } = setup();

    await userEvent.click(screen.getByRole('button', { name: 'Move step 2 down' }));

    expect(await screen.findByText('Only a draft can be edited')).toBeInTheDocument();
    expect(onReordered).not.toHaveBeenCalled();
  });
});

describe('StepList', () => {
  it('lists the steps with their type and a line about what is in them', () => {
    setup();

    const first = screen.getByRole('listitem', { name: /step 1: meet the machine/i });
    expect(within(first).getByText('Video')).toBeInTheDocument();
    expect(within(first).getByText(/no video uploaded yet/i)).toBeInTheDocument();
    expect(screen.getByRole('listitem', { name: /step 3: final quiz/i })).toHaveTextContent(
      /no topics chosen yet/i,
    );
  });

  it('opens a step for editing', async () => {
    const { onEdit } = setup();

    await userEvent.click(screen.getByRole('button', { name: 'Edit step 2' }));

    expect(onEdit).toHaveBeenCalledWith(steps[1]);
  });

  it('shows the publish-check problems under the step they are about', () => {
    setup({
      issues: [
        { path: 'steps[1] "Meet the machine"', message: 'The video has no uploaded file yet' },
        { path: 'signoffChecklist', message: 'Not about a step' },
      ],
    });

    const first = screen.getByRole('listitem', { name: /step 1/i });
    expect(within(first).getByText('The video has no uploaded file yet')).toBeInTheDocument();
    expect(screen.queryByText('Not about a step')).not.toBeInTheDocument();
  });

  it('deletes a step only after confirmation', async () => {
    api.deleteStep.mockResolvedValue(null);
    const { onDeleted } = setup();

    await userEvent.click(screen.getByRole('button', { name: 'Delete step 2' }));
    expect(api.deleteStep).not.toHaveBeenCalled();
    expect(screen.getByText(/safe operation.*removed from this draft/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Delete step' }));

    await waitFor(() => expect(api.deleteStep).toHaveBeenCalledWith(100, 12));
    await waitFor(() => expect(onDeleted).toHaveBeenCalled());
  });

  it('keeps the step when the deletion is cancelled', async () => {
    setup();

    await userEvent.click(screen.getByRole('button', { name: 'Delete step 2' }));
    await userEvent.click(screen.getByRole('button', { name: 'Keep the step' }));

    expect(api.deleteStep).not.toHaveBeenCalled();
  });

  it('explains an empty draft', () => {
    render(
      <StepList
        versionId={100}
        steps={[]}
        issues={[]}
        onEdit={vi.fn()}
        onReordered={vi.fn()}
        onDeleted={vi.fn()}
      />,
    );

    expect(screen.getByText(/no steps yet/i)).toBeInTheDocument();
  });
});
