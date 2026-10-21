'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { trainingAPI } from '@/api/client/training';
import type { PreviewControls, TrainingRuntimeApi } from '@/types/training-preview';

interface TrainingRuntime {
  api: TrainingRuntimeApi;
  /** Set only in staff preview mode; null for a real student attempt. */
  preview: PreviewControls | null;
}

const RuntimeContext = createContext<TrainingRuntime | null>(null);

/**
 * Tells the learner components where their data comes from. Without a provider they talk to the
 * real learner API. Staff preview wraps the player in one that answers every call inside the
 * browser (nothing is sent or stored) and switches on the preview-only behaviour: free video
 * seeking, the answer reveal after a quiz, skipping and restarting.
 */
export function TrainingRuntimeProvider({
  api,
  preview,
  children,
}: {
  api: TrainingRuntimeApi;
  preview: PreviewControls;
  children: ReactNode;
}) {
  return <RuntimeContext.Provider value={{ api, preview }}>{children}</RuntimeContext.Provider>;
}

export function useTrainingRuntime(): TrainingRuntime {
  const runtime = useContext(RuntimeContext);
  return runtime ?? { api: trainingAPI, preview: null };
}
