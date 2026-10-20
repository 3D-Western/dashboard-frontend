import { describe, it, expect, vi, type Mock } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@/api/client/errors';
import { trainingAdminAPI } from '@/api/client/training-admin';
import { createVersionDetail } from '@test/utils/trainingAdminFactories';
import { ChecklistEditor } from './ChecklistEditor';

vi.mock('@/api/client/training-admin', () => ({
  trainingAdminAPI: { setChecklist: vi.fn() },
}));

const api = trainingAdminAPI as unknown as { setChecklist: Mock };

const items = [
  { key: 'estop', label: 'Shows where the emergency stop is' },
  { key: 'fan', label: 'Turns on the extraction fan' },
];

const open = (initial = items) => {
  const onSaved = vi.fn();
  render(<ChecklistEditor versionId={100} items={initial} onSaved={onSaved} />);
  return { onSaved };
};

describe('ChecklistEditor', () => {
  it('lists the items in order and keeps save off until something changes', () => {
    open();

    expect(screen.getByLabelText('Checklist item 1')).toHaveValue(items[0].label);
    expect(screen.getByLabelText('Checklist item 2')).toHaveValue(items[1].label);
    expect(screen.getByRole('button', { name: /save checklist/i })).toBeDisabled();
  });

  it('adds an item with a key made from its label, and saves the list', async () => {
    api.setChecklist.mockResolvedValue(
      createVersionDetail([], {
        signoffChecklist: [...items, { key: 'focus', label: 'Sets the focus' }],
      }),
    );
    const { onSaved } = open();

    await userEvent.click(screen.getByRole('button', { name: /add an item/i }));
    await userEvent.type(screen.getByLabelText('Checklist item 3'), 'Sets the focus');
    await userEvent.click(screen.getByRole('button', { name: /save checklist/i }));

    await waitFor(() =>
      expect(api.setChecklist).toHaveBeenCalledWith(100, [
        ...items,
        { key: 'sets_the_focus', label: 'Sets the focus' },
      ]),
    );
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
  });

  it('reorders and removes items', async () => {
    api.setChecklist.mockResolvedValue(createVersionDetail([], { signoffChecklist: [items[1]] }));
    open();

    await userEvent.click(screen.getByRole('button', { name: 'Move item 2 up' }));
    expect(screen.getByLabelText('Checklist item 1')).toHaveValue(items[1].label);

    await userEvent.click(screen.getByRole('button', { name: 'Remove item 2' }));
    await userEvent.click(screen.getByRole('button', { name: /save checklist/i }));

    await waitFor(() => expect(api.setChecklist).toHaveBeenCalledWith(100, [items[1]]));
  });

  it('keeps a key the author typed when the label changes', async () => {
    open();

    await userEvent.clear(screen.getByLabelText('Checklist item 1'));
    await userEvent.type(screen.getByLabelText('Checklist item 1'), 'Different words');

    expect(screen.getAllByLabelText('Key')[0]).toHaveValue('estop');
  });

  it('refuses a blank label, a bad key and a repeated key before saving', async () => {
    open();

    await userEvent.clear(screen.getByLabelText('Checklist item 1'));
    expect(screen.getByText(/describe what the supervisor confirms/i)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Checklist item 1'), 'ok');
    await userEvent.clear(screen.getAllByLabelText('Key')[1]);
    await userEvent.type(screen.getAllByLabelText('Key')[1], 'estop');
    // Both rows that share the key are flagged
    expect(screen.getAllByText(/needs its own key/i)).toHaveLength(2);
    await userEvent.clear(screen.getAllByLabelText('Key')[1]);
    await userEvent.type(screen.getAllByLabelText('Key')[1], 'Bad Key');
    expect(screen.getByText(/lowercase letters, digits/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /save checklist/i }));
    expect(api.setChecklist).not.toHaveBeenCalled();
  });

  it('shows what the server refused', async () => {
    api.setChecklist.mockRejectedValue(
      new ApiError('VALIDATION_FAILED', 'Validation failed', {
        errors: [
          {
            path: 'items',
            message: 'This training has no in-person sign-off, so it has no checklist',
          },
        ],
      }),
    );
    open();
    await userEvent.type(screen.getByLabelText('Checklist item 2'), '!');

    await userEvent.click(screen.getByRole('button', { name: /save checklist/i }));

    expect(
      await screen.findByText(/no in-person sign-off, so it has no checklist/i),
    ).toBeInTheDocument();
  });
});
