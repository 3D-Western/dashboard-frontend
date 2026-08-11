import React from 'react';

interface CapacityGaugeProps {
  currentBookings: number;
  maxCapacity: number;
}

export default function CapacityGauge({ currentBookings, maxCapacity }: CapacityGaugeProps) {
  // Prevent division by zero and cap the percentage at 100%
  const safeMax = maxCapacity > 0 ? maxCapacity : 1;
  const utilizationPercentage = Math.min((currentBookings / safeMax) * 100, 100);

  // Determine color based on how full the capacity is
  let barColor = 'bg-status-success';
  if (utilizationPercentage >= 90) {
    barColor = 'bg-status-error';
  } else if (utilizationPercentage >= 75) {
    barColor = 'bg-status-flagged';
  }

  return (
    <div className="w-full">
      <div className="mb-1 flex items-end justify-between">
        <span className="text-sm font-medium text-muted-foreground">Current Utilization</span>
        <span className="text-sm font-bold">
          {currentBookings} / {maxCapacity === 999 ? '∞' : maxCapacity}
        </span>
      </div>

      <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-2.5 rounded-full transition-all duration-500 ease-out ${barColor}`}
          style={{ width: `${utilizationPercentage}%` }}
        ></div>
      </div>

      {utilizationPercentage >= 100 && (
        <p className="mt-1 text-xs font-medium text-destructive">
          Maximum capacity reached. Waitlist active.
        </p>
      )}
    </div>
  );
}
