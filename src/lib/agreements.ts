import { trainingAPI } from '@/api/client/training';
import type { Agreement } from '@/types/training';

/**
 * The agreements the signed-in member still has to accept (server side). If the training API
 * can't be reached this returns none: a hiccup there should not lock every member out of the
 * dashboard. The acceptance itself is recorded by the backend, so nothing is skipped silently.
 */
export async function loadPendingAgreements(): Promise<Agreement[]> {
  try {
    return await trainingAPI.getPendingAgreements();
  } catch (error) {
    console.error('Could not load pending agreements', error);
    return [];
  }
}
