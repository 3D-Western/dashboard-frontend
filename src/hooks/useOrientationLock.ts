import { useTrainings } from '@/providers/trainings-provider';

/**
 * Whether printing is locked behind Maker Orientation for me. Locked only when the server says
 * orientation is required (setting on, one is published, not exempt staff) and I haven't passed.
 * Fails open: while loading, or if the list can't be loaded, nothing is locked (the server still
 * refuses with ORIENTATION_REQUIRED). Needs a TrainingsProvider.
 */
export function useOrientationLock(): { locked: boolean; isLoading: boolean } {
  const { data, isLoading } = useTrainings();
  return {
    locked: !!data && data.orientationRequired && !data.orientationComplete,
    isLoading,
  };
}
