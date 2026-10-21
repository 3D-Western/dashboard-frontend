import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@test/utils/render';
import userEvent from '@testing-library/user-event';
import { TextConsentCheckbox } from './TextConsentCheckbox';

describe('TextConsentCheckbox', () => {
  it('toggles when the label text is tapped, and the label row is 44 px tall on phones', async () => {
    const onCheckedChange = vi.fn();
    const user = userEvent.setup();
    render(
      <TextConsentCheckbox
        id="text-consent"
        checked={false}
        onCheckedChange={onCheckedChange}
        disabled={false}
      />,
    );

    const checkbox = screen.getByRole('checkbox', { name: 'Text me about my prints and access' });
    const label = checkbox.closest('label');
    expect(label).toHaveClass('min-h-11', 'fine:min-h-0');

    await user.click(screen.getByText('Text me about my prints and access'));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('does not change while disabled (no phone number yet)', async () => {
    const onCheckedChange = vi.fn();
    const user = userEvent.setup();
    render(
      <TextConsentCheckbox
        id="text-consent"
        checked={false}
        onCheckedChange={onCheckedChange}
        disabled
      />,
    );

    await user.click(screen.getByText('Text me about my prints and access'));
    expect(onCheckedChange).not.toHaveBeenCalled();
    expect(screen.getByText('Add a phone number to turn this on.')).toBeInTheDocument();
  });
});
