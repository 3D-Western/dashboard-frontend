import { describe, expect, it } from 'vitest';
import { ApiError, ErrorCodes } from './errors';
import { formatApiErrorMessage } from './error-messages';

describe('formatApiErrorMessage', () => {
  it('formats missing permission details for forbidden API errors', () => {
    const error = new ApiError(ErrorCodes.FORBIDDEN, 'Missing permission: users:list', {
      missingPermission: 'users:list',
      requiredScope: 'any',
    });

    expect(formatApiErrorMessage(error, 'Fallback')).toBe(
      'Missing permission: users:list (scope: any).',
    );
  });

  it('falls back to the API error message when no permission details exist', () => {
    const error = new ApiError(ErrorCodes.FORBIDDEN, 'System groups cannot be modified');

    expect(formatApiErrorMessage(error, 'Fallback')).toBe('System groups cannot be modified');
  });

  it('uses the fallback for non API errors', () => {
    expect(formatApiErrorMessage(new Error('Unexpected'), 'Fallback')).toBe('Fallback');
  });
});
