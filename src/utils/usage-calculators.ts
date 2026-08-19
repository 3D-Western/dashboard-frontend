import { TrainingLevel } from '@/types/training';

// ONLY ACCESS built for now, not sure about usage right now
export function canAccessBooking(trainingLevel: TrainingLevel | null | undefined): boolean {
  return trainingLevel === 'LEVEL_2';
}