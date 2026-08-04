import React from 'react';
import { ConflictResponse } from '@/types/booking';

interface ConflictBannerProps {
  conflict: ConflictResponse;
}

export default function ConflictBanner({ conflict }: ConflictBannerProps) {
  return (
    <div className="mb-4 rounded-r-md border-l-4 border-red-500 bg-red-50 p-4">
      <div className="flex items-start">
        <div className="flex-shrink-0 pt-0.5">
          <span className="text-lg text-red-500" aria-hidden="true">
            ⚠️
          </span>
        </div>
        <div className="ml-3 w-full">
          <h3 className="text-sm font-medium text-red-800">Booking Conflict Detected</h3>
          <div className="mt-1 text-sm text-red-700">
            <p>{conflict.message}</p>
          </div>

          {conflict.alternativeSlots && conflict.alternativeSlots.length > 0 && (
            <div className="mt-3">
              <h4 className="text-xs font-semibold tracking-wider text-red-800 uppercase">
                Suggested Alternative Times:
              </h4>
              <ul className="mt-2 space-y-1">
                {conflict.alternativeSlots.map((slot, index) => (
                  <li
                    key={index}
                    className="mr-2 mb-2 inline-block rounded border border-red-200 bg-red-100/50 px-2 py-1 text-sm text-red-700"
                  >
                    {new Date(slot.startTime).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    -{' '}
                    {new Date(slot.endTime).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
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
