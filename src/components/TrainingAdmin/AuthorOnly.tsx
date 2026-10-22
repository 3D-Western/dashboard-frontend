'use client';

import type { ReactNode } from 'react';
import { useTrainingPermissions } from '@/hooks/useTrainingPermissions';

/**
 * Switches off every button and field inside it for someone who may read trainings (to publish
 * them) but not change them. The server refuses their changes anyway; this stops them trying.
 */
export function AuthorOnly({ children }: { children: ReactNode }) {
  const { canAuthor } = useTrainingPermissions();
  return (
    <fieldset disabled={!canAuthor} className="contents">
      {children}
    </fieldset>
  );
}
