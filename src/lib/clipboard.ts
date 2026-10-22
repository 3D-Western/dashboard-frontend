/**
 * Copies text to the clipboard.
 *
 * Uses the Clipboard API when the browser offers it. That API only exists on secure pages
 * (HTTPS or localhost), so on a plain-HTTP page (e.g. testing the dev server from a phone at
 * http://192.168.x.x:3000) it falls back to the older select-and-copy approach.
 * Throws if the text couldn't be copied.
 */
export async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.top = '0';
  textarea.style.left = '0';
  textarea.style.opacity = '0';

  // Inside an open dialog, focus can't leave it, so the textarea has to live in the dialog too
  const container = document.activeElement?.closest('[role="dialog"]') ?? document.body;
  container.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, text.length); // iOS ignores select() alone

  try {
    if (!document.execCommand('copy')) {
      throw new Error('Copy command was rejected');
    }
  } finally {
    textarea.remove();
  }
}
