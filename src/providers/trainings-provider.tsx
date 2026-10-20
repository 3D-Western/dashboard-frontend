'use client';

import { createContext, useContext } from 'react';
import { useMyTrainings, type MyTrainingsState } from '@/hooks/useMyTrainings';

const TrainingsContext = createContext<MyTrainingsState | null>(null);

/**
 * Loads my trainings once for everything beneath it, so the dashboard's orientation prompt and
 * training summary share a single request.
 */
export function TrainingsProvider({ children }: { children: React.ReactNode }) {
  const state = useMyTrainings();
  return <TrainingsContext.Provider value={state}>{children}</TrainingsContext.Provider>;
}

/** The state shared by the nearest TrainingsProvider. */
export function useTrainings(): MyTrainingsState {
  const context = useContext(TrainingsContext);
  if (!context) {
    throw new Error('useTrainings must be used inside a TrainingsProvider');
  }
  return context;
}
