export class ApiError extends Error {
  constructor(
    public code: string,
    message?: string,
    public details?: unknown,
    public redirectUrl?: string,
  ) {
    super(`${code}: ${message}`);
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
};
