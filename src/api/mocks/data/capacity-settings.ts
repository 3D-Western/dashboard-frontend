import { CapacitySettings } from '@/types/booking';
import { mockEquipment } from './equipment';

export const UNLIMITED = Number.MAX_SAFE_INTEGER;

// Every equipment category left in the booking domain (laser cutters, circuit machines, sewing
// machines, soldering stations, waterjet) is here specifically because it needs controlled/booked
// access rather than free-for-all use, so requiresTraining defaults to true in base() below instead
// of being an opt-in override per unit.
const overrides: Record<string, Partial<CapacitySettings>> = {
  'laser-1': { maxSimultaneousBookings: 1, requireAdminApproval: true },
  'laser-2': { maxSimultaneousBookings: 5 },
  'circuit-1': { maxSimultaneousBookings: 2, allowWaitlist: true },
  'sewing-1': { maxSimultaneousBookings: 3 },
  'sewing-2': { maxSimultaneousBookings: 3 },
  'soldering-1': { maxSimultaneousBookings: UNLIMITED, allowWaitlist: false },
  'soldering-2': { maxSimultaneousBookings: UNLIMITED, allowWaitlist: false },
  'waterjet-1': { maxSimultaneousBookings: 1, requireAdminApproval: true, allowWaitlist: true },
};

const base = (equipmentId: string): CapacitySettings => ({
  equipmentId,
  maxSimultaneousBookings: 1,
  requireAdminApproval: false,
  allowWaitlist: false,
  restrictions: { requiresTraining: true },
});

export const mockCapacitySettings: CapacitySettings[] = mockEquipment.map((equipment) => {
  const defaults = base(equipment.id);
  const override = overrides[equipment.id] ?? {};
  return {
    ...defaults,
    ...override,
    equipmentId: equipment.id,
    restrictions: { ...defaults.restrictions, ...override.restrictions },
  };
});
