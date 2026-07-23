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
  let barColor = 'bg-green-500';
  if (utilizationPercentage >= 90) {
    barColor = 'bg-red-500';
  } else if (utilizationPercentage >= 75) {
    barColor = 'bg-yellow-400';
  }

  return (
    <div className="w-full">
      <div className="flex justify-between items-end mb-1">
        <span className="text-sm font-medium text-gray-700">Current Utilization</span>
        <span className="text-sm font-bold text-gray-900">
          {currentBookings} / {maxCapacity === 999 ? '∞' : maxCapacity}
        </span>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
        <div 
          className={`h-2.5 rounded-full transition-all duration-500 ease-out ${barColor}`} 
          style={{ width: `${utilizationPercentage}%` }}
        ></div>
      </div>
      
      {utilizationPercentage >= 100 && (
        <p className="text-xs text-red-600 mt-1 font-medium">
          Maximum capacity reached. Waitlist active.
        </p>
      )}
    </div>
  );
}