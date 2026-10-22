'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { trainingAPI } from '@/api/client/training';
import type { PreviewControls, TrainingRuntimeApi } from '@/types/training-preview';

/** Set only while a student re-reads and re-watches a failed attempt's material. */
export interface ReviewControls {
  /** Where "Back to my results" goes. */
  exitHref: string;
}

interface TrainingRuntime {
  api: TrainingRuntimeApi;
  /** Set only in staff preview mode; null for a real student attempt. */
  preview: PreviewControls | null;
  /** Set only in review mode (a student looking back over a failed attempt); null otherwise. */
  review: ReviewControls | null;
}

const RuntimeContext = createContext<TrainingRuntime | null>(null);

/**
 * Tells the learner components where their data comes from. Without a provider they talk to the
 * real learner API. Staff preview wraps the player in one that answers every call inside the
 * browser (nothing is sent or stored) and switches on the preview-only behaviour: free video
 * seeking, the answer reveal after a quiz, skipping and restarting. Review mode (a student
 * looking back over a failed attempt) reads the material from the server, shows no questions and
 * records nothing.
 */
export function TrainingRuntimeProvider({
  api,
  preview = null,
  review = null,
  children,
}: {
  api: TrainingRuntimeApi;
  preview?: PreviewControls | null;
  review?: ReviewControls | null;
  children: ReactNode;
}) {
  return (
    <RuntimeContext.Provider value={{ api, preview, review }}>{children}</RuntimeContext.Provider>
  );
}

export function useTrainingRuntime(): TrainingRuntime {
  const runtime = useContext(RuntimeContext);
  return runtime ?? { api: trainingAPI, preview: null, review: null };
}
