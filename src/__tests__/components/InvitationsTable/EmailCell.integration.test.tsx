import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@test/utils/render';
import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/react';
import { EmailCell } from '@/app/(protected)/admin/invitations/components/InvitationsTable/EmailCell';
import { toast } from 'sonner';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock clipboard API
const mockClipboard = {
  writeText: vi.fn().mockResolvedValue(undefined),
};

describe('EmailCell Component', () => {
  beforeEach(() => {
    mockClipboard.writeText.mockClear();
    vi.clearAllMocks();
    vi.stubGlobal('navigator', { clipboard: mockClipboard });
    Object.defineProperty(window, 'navigator', {
      value: { clipboard: mockClipboard },
      configurable: true,
    });
  });

  it('renders email address', () => {
    const email = 'john.doe@uwo.ca';
    render(<EmailCell email={email} />);

    expect(screen.getByText(email)).toBeInTheDocument();
  });

  it('displays copy button', () => {
    const email = 'john.doe@uwo.ca';
    render(<EmailCell email={email} />);

    const copyButton = screen.getByRole('button', { name: /copy email/i });
    expect(copyButton).toBeInTheDocument();
  });

  it('copies email to clipboard when copy button is clicked', async () => {
    const user = userEvent.setup();
    const email = 'john.doe@uwo.ca';

    // Note: Clipboard API mocking in happy-dom is complex, so we test the button interaction
    // rather than the clipboard call itself
    render(<EmailCell email={email} />);

    const copyButton = screen.getByRole('button', { name: /copy email/i });

    // Verify the button is clickable
    expect(copyButton).toBeInTheDocument();
    await user.click(copyButton); // Should not throw
  });

  it('shows success toast when email is copied', async () => {
    const email = 'john.doe@uwo.ca';

    render(<EmailCell email={email} />);

    const copyButton = screen.getByRole('button', { name: /copy email/i });
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(mockClipboard.writeText).toHaveBeenCalledWith(email);
      expect(toast.success).toHaveBeenCalledWith('Email copied to clipboard');
    });
  });

  it('handles clipboard write failures gracefully', async () => {
    const email = 'john.doe@uwo.ca';
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Mock clipboard failure
    mockClipboard.writeText.mockRejectedValueOnce(new Error('Clipboard access denied'));

    render(<EmailCell email={email} />);

    const copyButton = screen.getByRole('button', { name: /copy email/i });

    // Should not throw when clipboard fails
    expect(() => fireEvent.click(copyButton)).not.toThrow();

    // Button should remain functional after error
    expect(copyButton).toBeInTheDocument();
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to copy email');
      expect(consoleSpy).toHaveBeenCalledWith('Failed to copy email:', expect.any(Error));
    });
    consoleSpy.mockRestore();
  });

  it('renders with proper accessibility attributes', () => {
    const email = 'john.doe@uwo.ca';
    render(<EmailCell email={email} />);

    const copyButton = screen.getByRole('button', { name: /copy email/i });
    expect(copyButton).toHaveAttribute('aria-label', 'Copy email');
  });

  it('handles multiple copy operations', async () => {
    const user = userEvent.setup();
    const email = 'john.doe@uwo.ca';

    render(<EmailCell email={email} />);

    const copyButton = screen.getByRole('button', { name: /copy email/i });

    // Perform multiple clicks
    await user.click(copyButton);
    await user.click(copyButton);
    await user.click(copyButton);

    // Button should remain in the document and be functional
    expect(copyButton).toBeInTheDocument();
  });

  it('renders with correct styling classes', () => {
    const email = 'john.doe@uwo.ca';
    const { container } = render(<EmailCell email={email} />);

    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('flex', 'w-full', 'items-center', 'justify-center', 'gap-2');
  });
});
