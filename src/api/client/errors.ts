export class ApiError extends Error {
  constructor(
    public code: string,
    message?: string,
    public details?: unknown,
    public redirectUrl?: string,
  ) {
    super(message ?? code);
    this.name = 'ApiError';
  }
}

export const ErrorCodes = {
  SESSION_INVALID: 'SESSION_INVALID',
  REQUEST_FAILED: 'REQUEST_FAILED',
  RESPONSE_INVALID_CONTENT_TYPE: 'RESPONSE_INVALID_CONTENT_TYPE',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  INVALID_RESET_CODE: 'INVALID_RESET_CODE',
  INVALID_RESET_TOKEN: 'INVALID_RESET_TOKEN',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_REQUEST: 'INVALID_REQUEST',
  UNSUPPORTED_FILE_TYPE: 'UNSUPPORTED_FILE_TYPE',
  FILE_SIZE_EXCEEDED: 'FILE_SIZE_EXCEEDED',
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  FILE_IN_USE: 'FILE_IN_USE',
  FORBIDDEN: 'FORBIDDEN',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  INVALID_OTP: 'INVALID_OTP',
  INVITATION_NOT_FOUND: 'INVITATION_NOT_FOUND',
  INVITATION_ALREADY_EXISTS: 'INVITATION_ALREADY_EXISTS',
  INVITATION_ALREADY_REVOKED: 'INVITATION_ALREADY_REVOKED',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  OTP_EXPIRED: 'OTP_EXPIRED',
  OTP_ALREADY_USED: 'OTP_ALREADY_USED',
  CHALLENGE_NOT_FOUND: 'CHALLENGE_NOT_FOUND',
  TOO_MANY_OTP_ATTEMPTS: 'TOO_MANY_OTP_ATTEMPTS',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
};

/** Codes the backend returns when a request carries no usable session. */
const NO_SESSION_CODES = new Set<string>([
  ErrorCodes.UNAUTHORIZED,
  ErrorCodes.SESSION_INVALID,
  ErrorCodes.SESSION_EXPIRED,
]);

/** Codes meaning the backend could not be reached or failed, as opposed to rejecting the request. */
const BACKEND_UNAVAILABLE_CODES = new Set<string>([
  ErrorCodes.REQUEST_FAILED,
  ErrorCodes.RESPONSE_INVALID_CONTENT_TYPE,
  ErrorCodes.INTERNAL_SERVER_ERROR,
]);

/** The request had no session, or an expired or invalid one: the visitor is logged out. */
export function isNoSessionError(error: unknown): error is ApiError {
  return error instanceof ApiError && NO_SESSION_CODES.has(error.code);
}

/**
 * The backend was down, unreachable or broken, so nothing is known about the session. Anything
 * that is not an ApiError counts too, since it did not come from a backend answer.
 */
export function isBackendUnavailableError(error: unknown): boolean {
  return !(error instanceof ApiError) || BACKEND_UNAVAILABLE_CODES.has(error.code);
}
