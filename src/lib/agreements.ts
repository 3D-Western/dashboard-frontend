import { isNoSessionError } from '@/api/client/errors';
import { trainingAPI } from '@/api/client/training';
import type { Agreement } from '@/types/training';

/** How long the dashboard waits for the agreements check before letting the member through. */
export const AGREEMENTS_TIMEOUT_MS = 3000;

/**
 * The agreements the signed-in member still has to accept (server side). The layout runs this in
 * parallel with the session check, so a slow training API delays the dashboard by at most
 * [AGREEMENTS_TIMEOUT_MS].
 *
 * It FAILS OPEN: if the call errors or times out, this returns none, so a hiccup there does not
 * lock every member out of the dashboard. That means a member can briefly get past the gate, so
 * it is logged as an error every time. The backend records acceptances itself and nothing is
 * skipped silently; the gate comes back on the next page load.
 */
export async function loadPendingAgreements(): Promise<Agreement[]> {
  try {
    return await trainingAPI.getPendingAgreements({
      signal: AbortSignal.timeout(AGREEMENTS_TIMEOUT_MS),
    });
  } catch (error) {
    // Not signed in: the layout redirects to login, so there is nothing to report
    if (isNoSessionError(error)) return [];
    console.error(
      '[agreements] Could not check pending agreements; FAILING OPEN, so this member was not asked to accept them on this page load.',
      error,
    );
    return [];
  }
}
