import { ApiError, ErrorCodes } from './errors';

interface PermissionErrorDetails {
  missingPermission?: unknown;
  requiredScope?: unknown;
}

function isPermissionErrorDetails(details: unknown): details is PermissionErrorDetails {
  return typeof details === 'object' && details !== null && 'missingPermission' in details;
}

export function formatApiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (error.code === ErrorCodes.FORBIDDEN && isPermissionErrorDetails(error.details)) {
      const missingPermission = error.details.missingPermission;
      const requiredScope = error.details.requiredScope;

      if (typeof missingPermission === 'string' && missingPermission.length > 0) {
        const scopeSuffix =
          typeof requiredScope === 'string' && requiredScope.length > 0
            ? ` (scope: ${requiredScope})`
            : '';
        return `Missing permission: ${missingPermission}${scopeSuffix}.`;
      }
    }

    return error.message || fallback;
  }

  return fallback;
}
