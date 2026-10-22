import db from '@/api/mocks/database/db';
import { Booking, AlternativeSlot } from '@/types/booking';

type BookingWindow = { startTime: string; endTime: string };

const isActive = (b: Booking): boolean => b.status !== 'CANCELLED' && b.status !== 'REJECTED';

export function checkOverlap(existingBookings: Booking[], newBooking: BookingWindow): Booking[] {
  return existingBookings
    .filter(isActive)
    .filter((b) => newBooking.startTime < b.endTime && newBooking.endTime > b.startTime);
}

export function validateCapacity(
  equipmentId: string,
  from: string,
  to: string,
  requestedCount = 1,
): { withinCapacity: boolean; overlapping: Booking[]; remaining: number; capacity: number } {
  const capacity = db.getCapacitySettings(equipmentId).maxSimultaneousBookings;
  const existing = db.getBookings({ equipmentId }).filter(isActive);
  const overlapping = checkOverlap(existing, { startTime: from, endTime: to });
  const remaining = Math.max(capacity - overlapping.length, 0);
  return {
    withinCapacity: overlapping.length + requestedCount <= capacity,
    overlapping,
    remaining,
    capacity,
  };
}

export function suggestAlternativeSlots(
  equipmentId: string,
  from: string,
  to: string,
  count = 3,
): AlternativeSlot[] {
  const durationMs = Date.parse(to) - Date.parse(from);
  const slots: AlternativeSlot[] = [];
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return slots;
  }

  let cursor = Date.parse(to);
  let guard = 0;
  while (slots.length < count && guard < 48) {
    guard += 1;
    const startTime = new Date(cursor).toISOString();
    const endTime = new Date(cursor + durationMs).toISOString();
    const { withinCapacity, remaining } = validateCapacity(equipmentId, startTime, endTime);
    if (withinCapacity) {
      slots.push({ startTime, endTime, availableCapacity: remaining });
    }
    cursor += durationMs;
  }
  return slots;
}
