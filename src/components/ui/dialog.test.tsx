import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog';

/** Makes window.matchMedia report a touch screen (coarse pointer) or not. */
function setCoarsePointer(coarse: boolean) {
  vi.mocked(window.matchMedia).mockImplementation(
    (query: string) =>
      ({
        matches: coarse && query === '(pointer: coarse)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }) as unknown as MediaQueryList,
  );
}

function FormDialog({ stickyFooter = false }: { stickyFooter?: boolean }) {
  return (
    <Dialog open>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit step</DialogTitle>
          <DialogDescription>Change the details below.</DialogDescription>
        </DialogHeader>
        <label htmlFor="step-title">Step title</label>
        <input id="step-title" defaultValue="Introduction" />
        <DialogFooter stickyFooter={stickyFooter}>
          <button type="button">Save</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

describe('Dialog', () => {
  afterEach(() => {
    setCoarsePointer(false);
  });

  describe('initial focus', () => {
    it('focuses the first field on a mouse or keyboard device', async () => {
      setCoarsePointer(false);
      render(<FormDialog />);

      await waitFor(() => {
        expect(screen.getByLabelText('Step title')).toHaveFocus();
      });
    });

    it('focuses the title instead of the first field on a touch screen', async () => {
      setCoarsePointer(true);
      render(<FormDialog />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Edit step' })).toHaveFocus();
      });
      expect(screen.getByLabelText('Step title')).not.toHaveFocus();
    });
  });

  describe('footer', () => {
    it('keeps the footer at the bottom of a scrolling dialog when stickyFooter is set', () => {
      render(<FormDialog stickyFooter />);

      const footer = screen.getByRole('button', { name: 'Save' }).parentElement;
      expect(footer).toHaveAttribute('data-slot', 'dialog-footer');
      expect(footer).toHaveClass('sticky', 'bottom-0', 'bg-popover');
    });

    it('does not make the footer sticky by default', () => {
      render(<FormDialog />);

      const footer = screen.getByRole('button', { name: 'Save' }).parentElement;
      expect(footer).not.toHaveClass('sticky');
    });
  });
});
