import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { formatInTimeZone } from 'date-fns-tz';
import { useLocalTime } from './useLocalTime';

function LocalTimeDisplay({ value, format }: { value: string; format?: string }) {
  const formatted = useLocalTime(value, format);
  return <span>{formatted}</span>;
}

describe('useLocalTime', () => {
  const dateString = '2024-01-15T12:00:00Z';
  const defaultFormat = 'yyyy-MM-dd HH:mm';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns UTC time before mount (SSR safety)', () => {
    const expected = formatInTimeZone(dateString, 'UTC', defaultFormat);
    const output = renderToString(<LocalTimeDisplay value={dateString} />);

    expect(output).toContain(expected);
  });

  it('converts to local timezone after mount', async () => {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const expected = formatInTimeZone(dateString, timeZone, defaultFormat);
    const { result } = renderHook(() => useLocalTime(dateString));

    await waitFor(() => {
      expect(result.current).toBe(expected);
    });
  });

  it('respects custom format string', async () => {
    const format = 'MMM dd, yyyy HH:mm';
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const expected = formatInTimeZone(dateString, timeZone, format);
    const { result } = renderHook(() => useLocalTime(dateString, format));

    await waitFor(() => {
      expect(result.current).toBe(expected);
    });
  });

  it('updates when date prop changes', async () => {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const nextDate = '2024-02-01T08:30:00Z';
    const { result, rerender } = renderHook(
      ({ value }) => useLocalTime(value),
      { initialProps: { value: dateString } },
    );

    await waitFor(() => {
      expect(result.current).toBe(
        formatInTimeZone(dateString, timeZone, defaultFormat),
      );
    });

    rerender({ value: nextDate });

    await waitFor(() => {
      expect(result.current).toBe(
        formatInTimeZone(nextDate, timeZone, defaultFormat),
      );
    });
  });

  it('handles invalid date strings gracefully', async () => {
    const invalidDate = 'not-a-date';
    const { result } = renderHook(() => useLocalTime(invalidDate));

    await waitFor(() => {
      expect(result.current).toBe(invalidDate);
    });
  });

  it('handles empty string input', async () => {
    const { result } = renderHook(() => useLocalTime(''));

    await waitFor(() => {
      expect(result.current).toBe('');
    });
  });

  it('handles null/undefined input', async () => {
    const input = undefined as unknown as string;
    const { result } = renderHook(() => useLocalTime(input));

    await waitFor(() => {
      expect(result.current).toBe(input);
    });
  });

  it('handles timezone edge cases', async () => {
    const edgeDate = '2024-03-10T01:30:00Z';
    const { result } = renderHook(() => useLocalTime(edgeDate));

    await waitFor(() => {
      expect(typeof result.current).toBe('string');
      expect(result.current).not.toBe('');
    });
  });
});
