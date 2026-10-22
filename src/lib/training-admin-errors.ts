import { ApiError } from '@/api/client/errors';
import type { ImportError, ValidationIssue } from '@/types/training-admin';

/** The `error.details` of an API error as a plain object ({} when there is none). */
function detailsOf(error: unknown): Record<string, unknown> {
  if (!(error instanceof ApiError)) return {};
  return typeof error.details === 'object' && error.details !== null
    ? (error.details as Record<string, unknown>)
    : {};
}

/**
 * Every problem the server listed for a request, in one shape.
 *
 * - `422 VALIDATION_FAILED` lists `details.errors[] = {path, message, line?, column?}`.
 * - `400 VALIDATION_FAILED` (a malformed field) sends `details = {field: message}`.
 */
export function issuesFromError(error: unknown): ValidationIssue[] {
  const details = detailsOf(error);
  if (Array.isArray(details.errors)) {
    return (details.errors as Array<Record<string, unknown>>)
      .filter((item) => item && typeof item.message === 'string')
      .map((item) => ({
        path: typeof item.path === 'string' ? item.path : null,
        message: item.message as string,
        line: typeof item.line === 'number' ? item.line : null,
        column: typeof item.column === 'number' ? item.column : null,
      }));
  }
  if (error instanceof ApiError && error.code === 'VALIDATION_FAILED') {
    return Object.entries(details)
      .filter(([, value]) => typeof value === 'string' && value !== '')
      .map(([path, message]) => ({ path, message: message as string }));
  }
  return [];
}

/** The same list, as the import screen shows it. */
export function importErrorsFromError(error: unknown): ImportError[] {
  return issuesFromError(error).map((issue) => ({
    line: issue.line ?? null,
    column: issue.column ?? null,
    path: issue.path ?? null,
    message: issue.message,
  }));
}

/** The permission the server says the caller lacks (`403 FORBIDDEN`), if it named one. */
export function missingPermissionOf(error: unknown): string | null {
  const permission = detailsOf(error).missingPermission;
  return typeof permission === 'string' ? permission : null;
}

const PERMISSION_WORDS: Record<string, string> = {
  'training:author': 'author trainings',
  'training:publish': 'publish trainings',
  'access:admin': 'manage the access system',
};

/**
 * A plain-language sentence for an error from the admin training API. The server's own message is
 * used for conflicts and validation, since it says exactly what clashed (a taken slug, an existing
 * draft); the rest are worded here.
 */
export function adminErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) return fallback;
  switch (error.code) {
    case 'FORBIDDEN': {
      const permission = missingPermissionOf(error);
      const what = permission ? (PERMISSION_WORDS[permission] ?? permission) : null;
      return what
        ? `You don't have permission to ${what}. Ask an admin to add it to your role.`
        : "You don't have permission to do that.";
    }
    case 'NOT_FOUND':
      return 'That no longer exists. Reload the page and try again.';
    case 'PAYLOAD_TOO_LARGE':
      return 'That file is too large. Import files can be at most 512 KB.';
    case 'DATA_CONFLICT':
      return 'Someone changed this at the same moment. Reload and try again.';
    case 'CONFLICT':
    case 'VALIDATION_FAILED': {
      const issues = issuesFromError(error);
      if (issues.length === 1) return issues[0].message;
      return error.message && error.message !== error.code ? error.message : fallback;
    }
    case 'REQUEST_FAILED':
      return "We couldn't reach the server. Check your connection and try again.";
    default:
      return error.message && error.message !== error.code ? error.message : fallback;
  }
}

/** Issues whose `path` is [field] (or starts with it), for showing a message beside a form field. */
export function issuesFor(issues: ValidationIssue[], field: string): ValidationIssue[] {
  return issues.filter((issue) => {
    const path = (issue.path ?? '').replace(/^settings\./, '');
    return path === field || path.startsWith(`${field}.`) || path.startsWith(`${field}[`);
  });
}

/**
 * The step position a publish-check issue is about. The server writes the path as
 * `steps[2] "Title"`, counting from 1.
 */
export function stepPositionOfIssue(issue: ValidationIssue): number | null {
  const match = /^steps\[(\d+)\]/.exec(issue.path ?? '');
  return match ? Number(match[1]) : null;
}
