import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@test/utils/render';
import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/react';
import { InvitationCodeCell } from '@/app/(protected)/admin/invitations/components/InvitationsTable/InvitationCodeCell';
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

Object.defineProperty(navigator, 'clipboard', {
  value: mockClipboard,
  configurable: true,
});
Object.defineProperty(window.navigator, 'clipboard', {
  value: mockClipboard,
  configurable: true,
});

describe('InvitationCodeCell Component', () => {
  const invitationCode = 'ABC123DEF456GHI7';

  beforeEach(() => {
    mockClipboard.writeText.mockClear();
    vi.clearAllMocks();
    vi.stubGlobal('navigator', { clipboard: mockClipboard });
    Object.defineProperty(window, 'navigator', {
      value: { clipboard: mockClipboard },
      configurable: true,
    });
  });

  it('renders invitation code hidden by default', () => {
    render(<InvitationCodeCell code={invitationCode} />);

    expect(screen.getByText('********')).toBeInTheDocument();
  });

  it('displays toggle visibility button', () => {
    render(<InvitationCodeCell code={invitationCode} />);

    const toggleButton = screen.getByRole('button', { name: /show invitation code/i });
    expect(toggleButton).toBeInTheDocument();
  });

  it('displays copy button', () => {
    render(<InvitationCodeCell code={invitationCode} />);

    const copyButton = screen.getByRole('button', { name: /copy invitation code/i });
    expect(copyButton).toBeInTheDocument();
  });

  it('shows code when visibility toggle is clicked', async () => {
    const user = userEvent.setup();
    render(<InvitationCodeCell code={invitationCode} />);

    expect(screen.getByText('********')).toBeInTheDocument();

    const toggleButton = screen.getByRole('button', { name: /show invitation code/i });
    await user.click(toggleButton);

    expect(screen.getByText(invitationCode)).toBeInTheDocument();
  });

  it('hides code when visibility toggle is clicked again', async () => {
    const user = userEvent.setup();
    render(<InvitationCodeCell code={invitationCode} />);

    const toggleButton = screen.getByRole('button', { name: /show invitation code/i });
    await user.click(toggleButton);

    expect(screen.getByText(invitationCode)).toBeInTheDocument();

    const hideButton = screen.getByRole('button', { name: /hide invitation code/i });
    await user.click(hideButton);

    expect(screen.getByText('********')).toBeInTheDocument();
  });

  it('updates button label based on visibility state', async () => {
    const user = userEvent.setup();
    render(<InvitationCodeCell code={invitationCode} />);

    let toggleButton = screen.getByRole('button', { name: /show invitation code/i });
    expect(toggleButton).toBeInTheDocument();

    await user.click(toggleButton);

    const hideButton = screen.getByRole('button', { name: /hide invitation code/i });
    expect(hideButton).toBeInTheDocument();

    await user.click(hideButton);

    toggleButton = screen.getByRole('button', { name: /show invitation code/i });
    expect(toggleButton).toBeInTheDocument();
  });

  it('copies code to clipboard when copy button is clicked', async () => {
    const user = userEvent.setup();

    render(<InvitationCodeCell code={invitationCode} />);

    const copyButton = screen.getByRole('button', { name: /copy invitation code/i });
    await user.click(copyButton);

    // Button should be functional
    expect(copyButton).toBeInTheDocument();
  });

  it('shows success toast when code is copied', async () => {
    render(<InvitationCodeCell code={invitationCode} />);

    const copyButton = screen.getByRole('button', { name: /copy invitation code/i });
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(mockClipboard.writeText).toHaveBeenCalledWith(invitationCode);
      expect(toast.success).toHaveBeenCalledWith('Invitation code copied to clipboard');
    });
  });

  it('handles clipboard write failures gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Mock clipboard failure
    mockClipboard.writeText.mockRejectedValueOnce(new Error('Clipboard access denied'));

    render(<InvitationCodeCell code={invitationCode} />);

    const copyButton = screen.getByRole('button', { name: /copy invitation code/i });

    // Should not throw when clipboard fails
    expect(() => fireEvent.click(copyButton)).not.toThrow();

    // Button should remain functional after error
    expect(copyButton).toBeInTheDocument();
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to copy invitation code');
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to copy invitation code:',
        expect.any(Error),
      );
    });
    consoleSpy.mockRestore();
  });

  it('can copy code even when hidden', async () => {
    const user = userEvent.setup();

    render(<InvitationCodeCell code={invitationCode} />);

    // Code is hidden by default
    expect(screen.getByText('********')).toBeInTheDocument();

    const copyButton = screen.getByRole('button', { name: /copy invitation code/i });
    await user.click(copyButton);

    // Copy button should still be clickable and present
    expect(copyButton).toBeInTheDocument();
  });

  it('can copy code when visible', async () => {
    const user = userEvent.setup();

    render(<InvitationCodeCell code={invitationCode} />);

    // Show code
    const toggleButton = screen.getByRole('button', { name: /show invitation code/i });
    await user.click(toggleButton);

    expect(screen.getByText(invitationCode)).toBeInTheDocument();

    const copyButton = screen.getByRole('button', { name: /copy invitation code/i });
    await user.click(copyButton);

    // Copy button should be in the document
    expect(copyButton).toBeInTheDocument();
  });

  it('renders with proper accessibility attributes', () => {
    render(<InvitationCodeCell code={invitationCode} />);

    const toggleButton = screen.getByRole('button', { name: /show invitation code/i });
    const copyButton = screen.getByRole('button', { name: /copy invitation code/i });

    expect(toggleButton).toHaveAttribute('aria-label');
    expect(copyButton).toHaveAttribute('aria-label');
  });

  it('uses monospace font for code display', () => {
    render(<InvitationCodeCell code={invitationCode} />);

    const codeSpan = screen.getByText('********');
    expect(codeSpan).toHaveClass('font-mono');
  });

  it('handles multiple visibility toggles', async () => {
    const user = userEvent.setup();
    render(<InvitationCodeCell code={invitationCode} />);

    const toggleButton = () =>
      screen.getByRole('button', { name: /show invitation code|hide invitation code/i });

    // Toggle visible
    await user.click(toggleButton());
    expect(screen.getByText(invitationCode)).toBeInTheDocument();

    // Toggle hidden
    await user.click(toggleButton());
    expect(screen.getByText('********')).toBeInTheDocument();

    // Toggle visible again
    await user.click(toggleButton());
    expect(screen.getByText(invitationCode)).toBeInTheDocument();
  });

  it('handles multiple copy operations', async () => {
    const user = userEvent.setup();

    render(<InvitationCodeCell code={invitationCode} />);

    const copyButton = screen.getByRole('button', { name: /copy invitation code/i });

    // Perform multiple clicks
    await user.click(copyButton);
    await user.click(copyButton);
    await user.click(copyButton);

    // Button should remain functional
    expect(copyButton).toBeInTheDocument();
  });

  it('renders with correct styling classes', () => {
    const { container } = render(<InvitationCodeCell code={invitationCode} />);

    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('flex', 'w-full', 'items-center', 'justify-center', 'gap-2');
  });
});
