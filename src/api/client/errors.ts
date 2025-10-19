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
};
