import type { Signoff } from '@/types/signoff';

export const createSignoff = (overrides: Partial<Signoff> = {}): Signoff => ({
  id: 9,
  status: 'PENDING',
  requestedAt: '2026-10-20T14:00:00Z',
  onlinePassedAt: '2026-10-20T14:00:00Z',
  student: { studentId: 251000123, firstName: 'Alex', lastName: 'Smith', email: 'alex@uwo.ca' },
  training: { id: 3, slug: 'laser-cutter', title: 'Laser Cutter', versionNo: 2 },
  attemptKind: 'FULL',
  checklist: [
    { key: 'estop', label: 'Shows where the emergency stop is' },
    { key: 'vent', label: 'Starts the ventilation' },
    { key: 'focus', label: 'Sets the focus height' },
  ],
  ownRequest: false,
  decidedAt: null,
  decidedBy: null,
  channel: null,
  notes: null,
  checklistResult: null,
  ...overrides,
});
