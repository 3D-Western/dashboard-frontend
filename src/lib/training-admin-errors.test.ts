import { describe, it, expect } from 'vitest';
import { ApiError } from '@/api/client/errors';
import {
  adminErrorMessage,
  importErrorsFromError,
  issuesFor,
  issuesFromError,
  missingPermissionOf,
  stepPositionOfIssue,
} from './training-admin-errors';

const validation = (errors: unknown[]) =>
  new ApiError('VALIDATION_FAILED', 'Validation failed', { errors });

describe('issuesFromError', () => {
  it('reads the list a 422 carries, with lines for imported files', () => {
    const error = validation([
      { path: 'steps[1]', message: 'No video', line: 4, column: 2 },
      { message: 'General' },
    ]);
    expect(issuesFromError(error)).toEqual([
      { path: 'steps[1]', message: 'No video', line: 4, column: 2 },
      { path: null, message: 'General', line: null, column: null },
    ]);
  });

  it('reads the field map a 400 carries', () => {
    const error = new ApiError('VALIDATION_FAILED', 'Validation failed', {
      reason: 'must not be blank',
    });
    expect(issuesFromError(error)).toEqual([{ path: 'reason', message: 'must not be blank' }]);
  });

  it('returns nothing for other errors', () => {
    expect(issuesFromError(new ApiError('CONFLICT', 'x'))).toEqual([]);
    expect(issuesFromError(new Error('x'))).toEqual([]);
    expect(importErrorsFromError(validation([{ path: 'a', message: 'b', line: 1 }]))).toEqual([
      { path: 'a', message: 'b', line: 1, column: null },
    ]);
  });
});

describe('adminErrorMessage', () => {
  it('names the missing permission in plain words', () => {
    const error = new ApiError('FORBIDDEN', 'no', { missingPermission: 'training:publish' });
    expect(missingPermissionOf(error)).toBe('training:publish');
    expect(adminErrorMessage(error, 'x')).toMatch(/permission to publish trainings/);
    expect(adminErrorMessage(new ApiError('FORBIDDEN', 'no'), 'x')).toMatch(
      /permission to do that/,
    );
  });

  it('words common failures for people', () => {
    expect(adminErrorMessage(new ApiError('NOT_FOUND', 'x'), 'f')).toMatch(/no longer exists/);
    expect(adminErrorMessage(new ApiError('PAYLOAD_TOO_LARGE', 'x'), 'f')).toMatch(/512 KB/);
    expect(adminErrorMessage(new ApiError('DATA_CONFLICT', 'x'), 'f')).toMatch(/same moment/);
    expect(adminErrorMessage(new ApiError('REQUEST_FAILED', 'x'), 'f')).toMatch(/reach the server/);
  });

  it('uses the server sentence for conflicts and a single validation problem', () => {
    expect(adminErrorMessage(new ApiError('CONFLICT', 'A draft already exists'), 'f')).toBe(
      'A draft already exists',
    );
    expect(adminErrorMessage(validation([{ message: 'Slug taken' }]), 'f')).toBe('Slug taken');
  });

  it('falls back when there is nothing better', () => {
    expect(adminErrorMessage(new Error('boom'), 'fallback')).toBe('fallback');
    expect(adminErrorMessage(new ApiError('SOMETHING', undefined), 'fallback')).toBe('fallback');
    expect(adminErrorMessage(new ApiError('SOMETHING', 'Specific'), 'fallback')).toBe('Specific');
  });
});

describe('issue helpers', () => {
  const issues = [
    { path: 'settings.passMarkPercent', message: 'a' },
    { path: 'settings.checkpoints[0].atSeconds', message: 'b' },
    { path: 'title', message: 'c' },
  ];

  it('finds the issues for one field, ignoring a settings. prefix', () => {
    expect(issuesFor(issues, 'passMarkPercent')).toHaveLength(1);
    expect(issuesFor(issues, 'checkpoints')).toHaveLength(1);
    expect(issuesFor(issues, 'title')[0].message).toBe('c');
    expect(issuesFor(issues, 'nothing')).toEqual([]);
  });

  it('reads the step position out of a publish-check path', () => {
    expect(stepPositionOfIssue({ path: 'steps[2] "Intro"', message: 'x' })).toBe(2);
    expect(stepPositionOfIssue({ path: 'steps', message: 'x' })).toBeNull();
    expect(stepPositionOfIssue({ path: null, message: 'x' })).toBeNull();
  });
});
