import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@test/utils/render';
import userEvent from '@testing-library/user-event';
import { CheckField } from './fields';

describe('CheckField', () => {
  it('toggles when its label is tapped, and the label row is 44 px tall on phones', async () => {
    const onCheckedChange = vi.fn();
    const user = userEvent.setup();
    render(
      <CheckField
        label="Critical question"
        checked={false}
        onCheckedChange={onCheckedChange}
        help="Counts double in the score"
      />,
    );

    const checkbox = screen.getByRole('checkbox', { name: 'Critical question' });
    expect(checkbox.closest('label')).toHaveClass('min-h-11', 'md:min-h-0');

    await user.click(screen.getByText('Critical question'));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('keeps the help text out of the checkbox name but still describes it', () => {
    render(
      <CheckField
        label="Show retired"
        checked
        onCheckedChange={() => {}}
        help="Retired questions are hidden by default"
      />,
    );

    const checkbox = screen.getByRole('checkbox', { name: 'Show retired' });
    expect(checkbox).toBeChecked();
    expect(checkbox).toHaveAccessibleDescription('Retired questions are hidden by default');
  });
});
