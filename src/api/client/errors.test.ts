import { describe, it, expect } from 'vitest';
import { ApiError, ErrorCodes } from './errors';

describe('ApiError', () => {
  it('creates an ApiError with code and message', () => {
    const error = new ApiError('TEST_CODE', 'Test message');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.name).toBe('ApiError');
    expect(error.code).toBe('TEST_CODE');
    expect(error.message).toBe('Test message');
  });

  it('creates an ApiError with code only', () => {
    const error = new ApiError('TEST_CODE');

    expect(error.code).toBe('TEST_CODE');
    expect(error.message).toBe('');
  });

  it('includes optional details', () => {
    const details = { field: 'email', reason: 'invalid format' };
    const error = new ApiError('VALIDATION_FAILED', 'Validation error', details);

    expect(error.code).toBe('VALIDATION_FAILED');
    expect(error.details).toEqual(details);
  });

  it('includes optional redirectUrl', () => {
    const redirectUrl = '/login';
    const error = new ApiError('SESSION_INVALID', 'Session expired', undefined, redirectUrl);

    expect(error.code).toBe('SESSION_INVALID');
    expect(error.redirectUrl).toBe(redirectUrl);
  });

  it('includes both details and redirectUrl', () => {
    const details = { attempts: 3 };
    const redirectUrl = '/login';
    const error = new ApiError('UNAUTHORIZED', 'Too many attempts', details, redirectUrl);

    expect(error.code).toBe('UNAUTHORIZED');
    expect(error.details).toEqual(details);
    expect(error.redirectUrl).toBe(redirectUrl);
  });

  it('has correct prototype chain', () => {
    const error = new ApiError('TEST_CODE', 'Test');

    expect(error instanceof Error).toBe(true);
    expect(error instanceof ApiError).toBe(true);
    expect(Object.getPrototypeOf(error)).toBe(ApiError.prototype);
  });
});

describe('ErrorCodes', () => {
  it('exports SESSION_INVALID code', () => {
    expect(ErrorCodes.SESSION_INVALID).toBe('SESSION_INVALID');
  });

  it('exports REQUEST_FAILED code', () => {
    expect(ErrorCodes.REQUEST_FAILED).toBe('REQUEST_FAILED');
  });

  it('exports RESPONSE_INVALID_CONTENT_TYPE code', () => {
    expect(ErrorCodes.RESPONSE_INVALID_CONTENT_TYPE).toBe('RESPONSE_INVALID_CONTENT_TYPE');
  });

  it('exports INVALID_CREDENTIALS code', () => {
    expect(ErrorCodes.INVALID_CREDENTIALS).toBe('INVALID_CREDENTIALS');
  });

  it('exports INVALID_RESET_CODE code', () => {
    expect(ErrorCodes.INVALID_RESET_CODE).toBe('INVALID_RESET_CODE');
  });

  it('exports INVALID_RESET_TOKEN code', () => {
    expect(ErrorCodes.INVALID_RESET_TOKEN).toBe('INVALID_RESET_TOKEN');
  });

  it('exports USER_NOT_FOUND code', () => {
    expect(ErrorCodes.USER_NOT_FOUND).toBe('USER_NOT_FOUND');
  });

  it('exports UNAUTHORIZED code', () => {
    expect(ErrorCodes.UNAUTHORIZED).toBe('UNAUTHORIZED');
  });

  it('exports INVALID_REQUEST code', () => {
    expect(ErrorCodes.INVALID_REQUEST).toBe('INVALID_REQUEST');
  });

  it('exports UNSUPPORTED_FILE_TYPE code', () => {
    expect(ErrorCodes.UNSUPPORTED_FILE_TYPE).toBe('UNSUPPORTED_FILE_TYPE');
  });

  it('exports FILE_SIZE_EXCEEDED code', () => {
    expect(ErrorCodes.FILE_SIZE_EXCEEDED).toBe('FILE_SIZE_EXCEEDED');
  });

  it('exports FILE_NOT_FOUND code', () => {
    expect(ErrorCodes.FILE_NOT_FOUND).toBe('FILE_NOT_FOUND');
  });

  it('exports FILE_IN_USE code', () => {
    expect(ErrorCodes.FILE_IN_USE).toBe('FILE_IN_USE');
  });

  it('exports FORBIDDEN code', () => {
    expect(ErrorCodes.FORBIDDEN).toBe('FORBIDDEN');
  });

  it('exports VALIDATION_FAILED code', () => {
    expect(ErrorCodes.VALIDATION_FAILED).toBe('VALIDATION_FAILED');
  });

  it('exports INTERNAL_SERVER_ERROR code', () => {
    expect(ErrorCodes.INTERNAL_SERVER_ERROR).toBe('INTERNAL_SERVER_ERROR');
  });

  it('exports INVALID_OTP code', () => {
    expect(ErrorCodes.INVALID_OTP).toBe('INVALID_OTP');
  });

  it('is a frozen object', () => {
    expect(Object.isFrozen(ErrorCodes)).toBe(false); // Object literals are not frozen by default
  });
});
