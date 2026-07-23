import React from 'react';
import { ConflictResponse } from '@/types/booking';

interface ConflictBannerProps {
  conflict: ConflictResponse;
}

export default function ConflictBanner({ conflict }: ConflictBannerProps) {
  return (
    <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded-r-md">
      <div className="flex items-start">
        <div className="flex-shrink-0 pt-0.5">
          <span className="text-red-500 text-lg" aria-hidden="true">⚠️</span>
        </div>
        <div className="ml-3 w-full">
          <h3 className="text-sm font-medium text-red-800">
            Booking Conflict Detected
          </h3>
          <div className="mt-1 text-sm text-red-700">
            <p>{conflict.message}</p>
          </div>
          
          {conflict.alternativeSlots && conflict.alternativeSlots.length > 0 && (
            <div className="mt-3">
              <h4 className="text-xs font-semibold text-red-800 uppercase tracking-wider">
                Suggested Alternative Times:
              </h4>
              <ul className="mt-2 space-y-1">
                {conflict.alternativeSlots.map((slot, index) => (
                  <li key={index} className="text-sm text-red-700 bg-red-100/50 px-2 py-1 rounded inline-block mr-2 mb-2 border border-red-200">
                    {new Date(slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(slot.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    <span className="ml-2 text-xs opacity-75">
                      ({slot.availableCapacity} slots left)
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}