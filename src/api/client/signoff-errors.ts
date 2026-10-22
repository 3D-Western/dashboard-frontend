import { ApiError, ErrorCodes } from './errors';

/** Error codes of the sign-off API (docs/plans/training-v1.md, "Sign-off API"). */
export const SignoffErrorCodes = {
  SIGNOFF_NOT_FOUND: 'SIGNOFF_NOT_FOUND',
  SIGNOFF_ALREADY_DECIDED: 'SIGNOFF_ALREADY_DECIDED',
  SIGNOFF_SELF_FORBIDDEN: 'SIGNOFF_SELF_FORBIDDEN',
  SIGNOFF_CHECKLIST_INCOMPLETE: 'SIGNOFF_CHECKLIST_INCOMPLETE',
  SIGNOFF_UNKNOWN_ITEM: 'SIGNOFF_UNKNOWN_ITEM',
  SIGNOFF_REASON_REQUIRED: 'SIGNOFF_REASON_REQUIRED',
  CERTIFICATION_CHANGED: 'CERTIFICATION_CHANGED',
} as const;

/** True when the request was already decided (by someone else, or in Teams): reload to see how. */
export function isAlreadyDecided(error: unknown): boolean {
  return error instanceof ApiError && error.code === SignoffErrorCodes.SIGNOFF_ALREADY_DECIDED;
}

/** Plain-language text for a sign-off failure; anything unknown falls back to [fallback]. */
export function signoffErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  if (!(error instanceof ApiError)) return fallback;
  switch (error.code) {
    case SignoffErrorCodes.SIGNOFF_ALREADY_DECIDED:
      return 'Someone else has already decided this sign-off. Go back to the list to see what is still waiting.';
    case SignoffErrorCodes.SIGNOFF_SELF_FORBIDDEN:
      return "You can't sign off your own training. Ask another supervisor.";
    case SignoffErrorCodes.SIGNOFF_CHECKLIST_INCOMPLETE:
      return 'Tick every item on the checklist before approving.';
    case SignoffErrorCodes.SIGNOFF_UNKNOWN_ITEM:
      return 'The checklist changed. Reload the page and try again.';
    case SignoffErrorCodes.SIGNOFF_REASON_REQUIRED:
      return 'Say why the sign-off is not approved.';
    case SignoffErrorCodes.CERTIFICATION_CHANGED:
      return "This student's training changed after they asked for sign-off, so it can no longer be approved. They will need to retake it.";
    case SignoffErrorCodes.SIGNOFF_NOT_FOUND:
      return "We couldn't find that sign-off request.";
    case ErrorCodes.FORBIDDEN:
      return "You don't have permission to sign off trainings.";
    case ErrorCodes.REQUEST_FAILED:
      return "We couldn't reach the server. Check your connection and try again.";
    case ErrorCodes.SESSION_INVALID:
    case ErrorCodes.SESSION_EXPIRED:
      return 'Your session has expired. Please sign in again.';
    default:
      return fallback;
  }
}
