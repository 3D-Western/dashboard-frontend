import { JobCategory } from '@/types/jobs';

// Single source of truth for the equipment categories offered in the booking
// flow - labels match the wording used on the New Job page so the same
// service isn't named differently in two places.
export const EQUIPMENT_CATEGORY_OPTIONS: { id: string; category: JobCategory; label: string }[] = [
  { id: 'printer-1', category: 'ThreeDPrint', label: '3D Printing' },
  { id: 'laser-1', category: 'LaserCutting', label: 'Laser Cutting' },
  { id: 'cnc-1', category: 'CNC', label: 'CNC Machining' },
  { id: 'waterjet-1', category: 'Waterjet', label: 'Water Jet Cutting' },
];

export const ALL_EQUIPMENT_OPTION = { id: 'all', label: 'All Equipment' };

export function getEquipmentCategoryLabel(category: JobCategory): string {
  return (
    EQUIPMENT_CATEGORY_OPTIONS.find((option) => option.category === category)?.label || category
  );
}
