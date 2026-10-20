import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OrientationLockNotice } from './OrientationLockNotice';

describe('OrientationLockNotice', () => {
  it('says what to do in plain words and links to Maker Orientation', () => {
    render(<OrientationLockNotice />);

    expect(
      screen.getByRole('heading', { name: 'Finish Maker Orientation to submit prints' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /go to maker orientation/i })).toHaveAttribute(
      'href',
      '/dashboard/training',
    );
  });

  it('is a plain section until told to interrupt, then an alert that takes focus', () => {
    const { rerender } = render(<OrientationLockNotice />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    rerender(<OrientationLockNotice interrupt />);
    expect(screen.getByRole('alert')).toHaveFocus();
  });
});
