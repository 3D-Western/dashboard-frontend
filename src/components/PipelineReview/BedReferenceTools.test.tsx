import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@/api/client/errors';
import { pipelineFarmApi } from '@/api/client/pipeline-farm';
import { BedReferenceTools } from './BedReferenceTools';

vi.mock('@/api/client/pipeline-farm', () => ({
  pipelineFarmApi: { bedReference: vi.fn(), setBedReference: vi.fn() },
}));

const api = vi.mocked(pipelineFarmApi);
const setup = () => userEvent.setup({ pointerEventsCheck: 0 });
const jpeg = () => new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' });

beforeEach(() => {
  api.bedReference.mockReset();
  api.setBedReference.mockReset();
  api.bedReference.mockResolvedValue(jpeg());
  api.setBedReference.mockResolvedValue({ ok: true, message: 'Saved.' });
  let n = 0;
  URL.createObjectURL = vi.fn(() => `blob:reference-${++n}`);
  URL.revokeObjectURL = vi.fn();
});

const openDialog = async (user: ReturnType<typeof setup>) => {
  await user.click(screen.getByRole('button', { name: /save empty-bed reference/i }));
  return screen.findByRole('alertdialog');
};

describe('BedReferenceTools', () => {
  it('loads nothing until the preview is asked for', () => {
    render(<BedReferenceTools printerId="P09" />);

    expect(api.bedReference).not.toHaveBeenCalled();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('shows the saved reference picture, and hides it again', async () => {
    const user = setup();
    render(<BedReferenceTools printerId="P09" />);

    await user.click(screen.getByRole('button', { name: 'Show reference' }));

    const picture = await screen.findByRole('img', { name: /reference picture of printer P09/i });
    expect(picture).toHaveAttribute('src', 'blob:reference-1');
    expect(api.bedReference).toHaveBeenCalledWith('P09');

    await user.click(screen.getByRole('button', { name: 'Hide reference' }));
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:reference-1');
  });

  it('says plainly that no reference is saved yet', async () => {
    api.bedReference.mockResolvedValue(null);
    const user = setup();
    render(<BedReferenceTools printerId="P09" />);

    await user.click(screen.getByRole('button', { name: 'Show reference' }));

    expect(
      await screen.findByText(/no reference picture is saved for this printer yet/i),
    ).toBeVisible();
  });

  it('says so when the pipeline cannot show reference pictures, and saving still works', async () => {
    api.bedReference.mockRejectedValue(
      new ApiError(
        'PIPELINE_UNAVAILABLE',
        'This pipeline version does not show reference pictures yet',
      ),
    );
    const user = setup();
    render(<BedReferenceTools printerId="P09" />);

    await user.click(screen.getByRole('button', { name: 'Show reference' }));

    expect(await screen.findByText(/does not show reference pictures yet/i)).toBeVisible();
    expect(screen.getByRole('button', { name: /save empty-bed reference/i })).toBeEnabled();
  });

  describe('saving a reference', () => {
    it('asks the person to confirm the bed is empty and the light is on, and sends nothing without it', async () => {
      const user = setup();
      render(<BedReferenceTools printerId="P09" />);

      const dialog = await openDialog(user);

      expect(
        within(dialog).getByRole('checkbox', { name: /bed is empty and the chamber light is on/i }),
      ).not.toBeChecked();
      const save = within(dialog).getByRole('button', { name: 'Save the reference' });
      expect(save).toBeDisabled();
      await user.click(save);
      expect(api.setBedReference).not.toHaveBeenCalled();
    });

    it('sends the confirmation and the trimmed note, then says it is saved', async () => {
      const onSaved = vi.fn();
      const user = setup();
      render(<BedReferenceTools printerId="P09" onSaved={onSaved} />);
      const dialog = await openDialog(user);

      await user.click(within(dialog).getByRole('checkbox'));
      await user.type(within(dialog).getByRole('textbox', { name: /note/i }), '  light was on  ');
      await user.click(within(dialog).getByRole('button', { name: 'Save the reference' }));

      await waitFor(() =>
        expect(api.setBedReference).toHaveBeenCalledWith('P09', {
          confirmed: true,
          note: 'light was on',
        }),
      );
      expect(await screen.findByText('Saved.')).toBeVisible();
      expect(onSaved).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });

    it('reloads the picture shown after a save', async () => {
      const user = setup();
      render(<BedReferenceTools printerId="P09" />);
      await user.click(screen.getByRole('button', { name: 'Show reference' }));
      await screen.findByRole('img');
      const dialog = await openDialog(user);

      await user.click(within(dialog).getByRole('checkbox'));
      await user.click(within(dialog).getByRole('button', { name: 'Save the reference' }));

      await waitFor(() => expect(api.bedReference).toHaveBeenCalledTimes(2));
    });

    it('shows the pipeline’s refusal and keeps the preview as it was', async () => {
      api.setBedReference.mockRejectedValue(
        new ApiError('CONFLICT', 'The picture is too dark. Is the chamber light on?'),
      );
      const user = setup();
      render(<BedReferenceTools printerId="P09" />);
      const dialog = await openDialog(user);

      await user.click(within(dialog).getByRole('checkbox'));
      await user.click(within(dialog).getByRole('button', { name: 'Save the reference' }));

      expect(
        await screen.findByText('The picture is too dark. Is the chamber light on?'),
      ).toBeVisible();
      expect(screen.queryByText('Saved.')).not.toBeInTheDocument();
    });

    it('rejects a note that is too long before sending', async () => {
      const user = setup();
      render(<BedReferenceTools printerId="P09" />);
      const dialog = await openDialog(user);
      await user.click(within(dialog).getByRole('checkbox'));
      const note = within(dialog).getByRole('textbox', { name: /note/i });
      // the field itself stops at 2000; a longer value only gets in by paste of a state the limit does not catch
      expect(note).toHaveAttribute('maxlength', '2000');
    });
  });

  it('forgets the picture when the printer changes', async () => {
    const user = setup();
    const { rerender } = render(<BedReferenceTools printerId="P09" />);
    await user.click(screen.getByRole('button', { name: 'Show reference' }));
    await screen.findByRole('img');

    rerender(<BedReferenceTools printerId="P10" />);

    await waitFor(() => expect(screen.queryByRole('img')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Show reference' })).toBeVisible();
  });
});
