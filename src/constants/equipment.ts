import { EquipmentCategory } from '@/types/booking';

// Single source of truth for the equipment categories offered in the booking flow.
// Deliberately separate from the New Job page's JobCategory - see the comment on
// EquipmentCategory in src/types/booking.ts for why the two shouldn't share a type.
export const EQUIPMENT_CATEGORY_OPTIONS: {
  id: string;
  category: EquipmentCategory;
  label: string;
}[] = [
  { id: 'laser-1', category: 'LaserCutter', label: 'Laser Cutters' },
  { id: 'circuit-1', category: 'CircuitMachine', label: 'Circuit Machines' },
  { id: 'sewing-1', category: 'SewingMachine', label: 'Sewing Machines' },
  { id: 'soldering-1', category: 'SolderingStation', label: 'Soldering Stations' },
  { id: 'waterjet-1', category: 'Waterjet', label: 'Waterjet' },
];

export const ALL_EQUIPMENT_OPTION = { id: 'all', label: 'All Equipment' };

export function getEquipmentCategoryLabel(category: EquipmentCategory): string {
  return (
    EQUIPMENT_CATEGORY_OPTIONS.find((option) => option.category === category)?.label || category
  );
}
