'use client';

import { useTrainings } from '@/providers/trainings-provider';
import { InstallPrompt } from './InstallPrompt';

/**
 * The dashboard's install card. Its moment of value is "Maker Orientation is passed": until then
 * it never shows. Must sit inside a TrainingsProvider.
 */
export function OrientationInstallPrompt() {
  const { data } = useTrainings();
  return <InstallPrompt moment={data?.orientationComplete ? 'orientation-passed' : null} />;
}
