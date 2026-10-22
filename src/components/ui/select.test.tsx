import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';

describe('SelectItem classes', () => {
  it('keeps the desktop row padding and the svg rule as separate classes', () => {
    render(
      <Select open value="a">
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">Alpha</SelectItem>
        </SelectContent>
      </Select>,
    );

    const option = screen.getByRole('option', { name: 'Alpha' });
    expect(option).toHaveClass('fine:py-1', '[&_svg]:pointer-events-none');
    // The two used to be joined into one token, "fine:py-1[&_svg]:pointer-events-none"
    expect(option.className).not.toContain('fine:py-1[');
  });
});
