// Deliberately separate from `equipment.ts` (EQUIPMENT_CATEGORY_OPTIONS), which is scoped to
// specific bookable machine instances for the Booking feature. This is a broader analytics
// taxonomy for the onboarding questionnaire — different, non-overlapping values — kept
// independent so the two domains can evolve without breaking each other.
export const EQUIPMENT_INTERESTS = {
  THREE_D_PRINTERS: 'three_d_printers',
  LASER_CUTTER: 'laser_cutter',
  CNC: 'cnc',
  WATERJET: 'waterjet',
  CRICUT: 'cricut',
  SEWING_MACHINES: 'sewing_machines',
  ELECTRONICS: 'electronics',
  WOODWORKING: 'woodworking',
} as const;

export type EquipmentInterest = (typeof EQUIPMENT_INTERESTS)[keyof typeof EQUIPMENT_INTERESTS];

export const EQUIPMENT_INTEREST_OPTIONS = [
  { value: EQUIPMENT_INTERESTS.THREE_D_PRINTERS, label: '3D Printers' },
  { value: EQUIPMENT_INTERESTS.LASER_CUTTER, label: 'Laser Cutter' },
  { value: EQUIPMENT_INTERESTS.CNC, label: 'CNC' },
  { value: EQUIPMENT_INTERESTS.WATERJET, label: 'Waterjet' },
  { value: EQUIPMENT_INTERESTS.CRICUT, label: 'Cricut' },
  { value: EQUIPMENT_INTERESTS.SEWING_MACHINES, label: 'Sewing Machines' },
  { value: EQUIPMENT_INTERESTS.ELECTRONICS, label: 'Electronics' },
  { value: EQUIPMENT_INTERESTS.WOODWORKING, label: 'Woodworking' },
] as const;
