import { describe, it, expect, vi, afterEach } from 'vitest';
import { copyToClipboard } from './clipboard';

const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');

function setClipboard(value: unknown) {
  Object.defineProperty(navigator, 'clipboard', { value, configurable: true });
}

describe('copyToClipboard', () => {
  afterEach(() => {
    if (originalClipboard) {
      Object.defineProperty(navigator, 'clipboard', originalClipboard);
    }
    vi.restoreAllMocks();
  });

  it('uses the Clipboard API when the browser has it', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard({ writeText });

    await copyToClipboard('job-123');

    expect(writeText).toHaveBeenCalledWith('job-123');
  });

  it('still copies on plain-HTTP pages where the Clipboard API is missing', async () => {
    setClipboard(undefined);
    const execCommand = vi.fn().mockReturnValue(true);
    document.execCommand = execCommand;

    await copyToClipboard('job-123');

    expect(execCommand).toHaveBeenCalledWith('copy');
    // The temporary text box is cleaned up
    expect(document.querySelector('textarea')).toBeNull();
  });

  it('reports a failure when the browser refuses to copy', async () => {
    setClipboard(undefined);
    document.execCommand = vi.fn().mockReturnValue(false);

    await expect(copyToClipboard('job-123')).rejects.toThrow();
  });
});
