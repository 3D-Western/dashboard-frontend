import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PasswordInput } from './password-input';

describe('PasswordInput toggle', () => {
  it('is a 44 px wide tap target on phones and keeps its desktop width', () => {
    render(<PasswordInput aria-label="Password" />);

    const toggle = screen.getByRole('button', { name: 'Show password' });
    expect(toggle).toHaveClass('w-11', 'fine:w-auto');
  });
});
