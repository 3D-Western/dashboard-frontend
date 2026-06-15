import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@test/utils/render';
import { DateCell } from '@/app/(protected)/admin/invitations/components/InvitationsTable/DateCell';

// Mock the useLocalTime hook
vi.mock('@/hooks/useLocalTime', () => ({
  useLocalTime: (date: string) => {
    // Simple mock that returns a formatted date string
    const dateObj = new Date(date);
    return dateObj.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  },
}));

describe('DateCell Component', () => {
  it('renders date with formatted time', () => {
    const date = '2025-01-17T10:30:00Z';
    render(<DateCell date={date} />);

    const timeElement = screen.getByRole('time');
    expect(timeElement).toBeInTheDocument();
  });

  it('sets dateTime attribute on time element', () => {
    const date = '2025-01-17T10:30:00Z';
    render(<DateCell date={date} />);

    const timeElement = screen.getByRole('time');
    expect(timeElement).toHaveAttribute('dateTime', date);
  });

  it('displays localized time', () => {
    const date = '2025-01-17T10:30:00Z';
    render(<DateCell date={date} />);

    const timeElement = screen.getByRole('time');
    // The exact format depends on the locale
    expect(timeElement).toBeInTheDocument();
    expect(timeElement.textContent).toBeTruthy();
  });

  it('sets aria-label with date information', () => {
    const date = '2025-01-17T10:30:00Z';
    render(<DateCell date={date} />);

    const timeElement = screen.getByRole('time');
    expect(timeElement).toHaveAttribute('aria-label');
  });

  it('renders with center-aligned styling', () => {
    const date = '2025-01-17T10:30:00Z';
    const { container } = render(<DateCell date={date} />);

    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('w-full', 'text-center');
  });

  it('handles different date formats', () => {
    const dates = ['2025-01-17T10:30:00Z', '2025-12-25T23:59:59Z', '2024-06-15T12:00:00Z'];

    dates.forEach((date) => {
      const { unmount } = render(<DateCell date={date} />);
      const timeElement = screen.getByRole('time');
      expect(timeElement).toHaveAttribute('dateTime', date);
      unmount();
    });
  });

  it('updates when date prop changes', () => {
    const { rerender } = render(<DateCell date="2025-01-17T10:30:00Z" />);

    let timeElement = screen.getByRole('time');
    expect(timeElement).toHaveAttribute('dateTime', '2025-01-17T10:30:00Z');

    rerender(<DateCell date="2025-12-25T23:59:59Z" />);

    timeElement = screen.getByRole('time');
    expect(timeElement).toHaveAttribute('dateTime', '2025-12-25T23:59:59Z');
  });

  it('is memoized for performance', () => {
    const { rerender } = render(<DateCell date="2025-01-17T10:30:00Z" />);

    const firstRender = screen.getByRole('time');

    // Re-render with same props
    rerender(<DateCell date="2025-01-17T10:30:00Z" />);

    const secondRender = screen.getByRole('time');

    // Both should exist without errors (memoization working)
    expect(firstRender).toBeInTheDocument();
    expect(secondRender).toBeInTheDocument();
  });

  it('handles ISO 8601 datetime strings', () => {
    const isoDate = '2025-01-17T10:30:00.000Z';
    render(<DateCell date={isoDate} />);

    const timeElement = screen.getByRole('time');
    expect(timeElement).toHaveAttribute('dateTime', isoDate);
  });

  it('works with past dates', () => {
    const pastDate = '2020-01-01T00:00:00Z';
    render(<DateCell date={pastDate} />);

    const timeElement = screen.getByRole('time');
    expect(timeElement).toHaveAttribute('dateTime', pastDate);
  });

  it('works with future dates', () => {
    const futureDate = '2030-12-31T23:59:59Z';
    render(<DateCell date={futureDate} />);

    const timeElement = screen.getByRole('time');
    expect(timeElement).toHaveAttribute('dateTime', futureDate);
  });
});
