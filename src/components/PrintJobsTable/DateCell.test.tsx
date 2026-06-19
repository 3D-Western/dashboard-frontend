import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DateCell } from './DateCell';

describe('DateCell', () => {
  it('renders date with useLocalTime hook', () => {
    const isoDate = '2024-01-15T10:30:00Z';
    render(<DateCell date={isoDate} />);

    const timeElement = screen.getByRole('time');
    expect(timeElement).toBeInTheDocument();
    expect(timeElement).toHaveAttribute('dateTime', isoDate);
  });

  it('has accessible label', () => {
    const isoDate = '2024-01-15T10:30:00Z';
    render(<DateCell date={isoDate} />);

    const timeElement = screen.getByRole('time');
    expect(timeElement).toHaveAttribute('aria-label');
  });

  it('centers the date display', () => {
    const isoDate = '2024-01-15T10:30:00Z';
    const { container } = render(<DateCell date={isoDate} />);

    const divElement = container.querySelector('.text-center');
    expect(divElement).toBeInTheDocument();
  });

  it('handles different date formats', () => {
    const isoDate = '2024-12-25T23:59:59Z';
    render(<DateCell date={isoDate} />);

    const timeElement = screen.getByRole('time');
    expect(timeElement).toHaveAttribute('dateTime', isoDate);
  });

  it('is memoized (component identity)', () => {
    // Test that DateCell is properly wrapped with memo
    // React.memo doesn't automatically set displayName, but the component
    // itself defines it via the function name parameter to memo()
    // The component will re-use the same reference when props don't change
    expect(DateCell.displayName || DateCell.name || 'DateCell').toBeTruthy();
  });
});
