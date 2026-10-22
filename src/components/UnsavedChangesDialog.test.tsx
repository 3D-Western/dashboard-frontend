import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UnsavedChangesDialog } from './UnsavedChangesDialog';

describe('UnsavedChangesDialog in controlled mode', () => {
  it('is shown only when asked to, with the wording it is given', () => {
    const { rerender } = render(<UnsavedChangesDialog isDirty open={false} />);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();

    rerender(
      <UnsavedChangesDialog
        isDirty
        open
        title="Discard it?"
        description="Gone for good."
        leaveLabel="Discard"
      />,
    );
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Discard it?');
    expect(screen.getByText('Gone for good.')).toBeInTheDocument();
  });

  it('reports the answer instead of navigating', async () => {
    const onLeave = vi.fn();
    const onStay = vi.fn();
    render(
      <UnsavedChangesDialog isDirty open onLeave={onLeave} onStay={onStay} leaveLabel="Discard" />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Keep editing' }));
    expect(onStay).toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Discard' }));
    expect(onLeave).toHaveBeenCalled();
  });

  it('does not intercept link clicks while a modal controls it', async () => {
    render(
      <>
        <a href="/elsewhere" onClick={(e) => e.preventDefault()}>
          Elsewhere
        </a>
        <UnsavedChangesDialog isDirty open={false} />
      </>,
    );

    await userEvent.click(screen.getByRole('link', { name: 'Elsewhere' }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});

describe('UnsavedChangesDialog when following links', () => {
  it('asks before a link is followed while there are unsaved changes', async () => {
    render(
      <>
        <a href="/elsewhere">Elsewhere</a>
        <UnsavedChangesDialog isDirty />
      </>,
    );

    await userEvent.click(screen.getByRole('link', { name: 'Elsewhere' }));

    expect(await screen.findByRole('alertdialog')).toHaveTextContent('Leave this page?');
  });
});
