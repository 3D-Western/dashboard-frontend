'use client';

import { useLocalTime } from '@/hooks/useLocalTime';
import { memo } from 'react';

interface DateCellProps {
  date: string;
}

export const DateCell = memo(function DateCell({ date }: DateCellProps) {
  const localTime = useLocalTime(date);

  return (
    <div className="w-full text-center">
      <time dateTime={date} aria-label={`Print date: ${localTime}`}>
        {localTime}
      </time>
    </div>
  );
});
