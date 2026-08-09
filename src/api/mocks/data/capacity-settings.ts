import { CapacitySettings } from '@/types/booking';
import { mockEquipment } from './equipment';

export const UNLIMITED = Number.MAX_SAFE_INTEGER;

const overrides: Record<string, Partial<CapacitySettings>> = {
  'printer-1': {
    maxSimultaneousBookings: 1,
    requireAdminApproval: true,
    allowWaitlist: true,
    restrictions: { requiresTraining: true },
  },
  'printer-2': { maxSimultaneousBookings: 1 },
  'printer-3': { maxSimultaneousBookings: 5 },
  'printer-4': { maxSimultaneousBookings: 10, allowWaitlist: true },
  'printer-5': { maxSimultaneousBookings: 1, requireAdminApproval: true },
  'laser-1': {
    maxSimultaneousBookings: 1,
    requireAdminApproval: true,
    restrictions: { requiresTraining: true },
  },
  'laser-2': { maxSimultaneousBookings: 5 },
  'cnc-1': { maxSimultaneousBookings: 1, restrictions: { requiresTraining: true } },
  'cnc-2': { maxSimultaneousBookings: UNLIMITED, allowWaitlist: false },
};

const base = (equipmentId: string): CapacitySettings => ({
  equipmentId,
  maxSimultaneousBookings: 1,
  requireAdminApproval: false,
  allowWaitlist: false,
  restrictions: { requiresTraining: false },
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
