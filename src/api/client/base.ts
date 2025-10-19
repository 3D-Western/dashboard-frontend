import { ApiResponseRaw } from '../types';
import { ApiError, ErrorCodes } from './errors';

const isDev = process.env.NODE_ENV === 'development';

export async function apiRequest<T>(
  url: string,
  options: RequestInit = {},
  suppressApiError = false,
  expectJson = true,
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (response.headers.get('Content-Type') !== 'application/json') {
    if (expectJson) {
      throw new ApiError(
        ErrorCodes.RESPONSE_INVALID_CONTENT_TYPE,
        'Response is not JSON (got ' + response.headers.get('Content-Type') + ')',
      );
    }
    return null as unknown as T; // Return null if response is not JSON
  }

  const data: ApiResponseRaw<T> = await response.json();

  if (isDev) console.log(data);

  // Don't throw based on response.ok - instead check the data.error field
  // This prevents browser console errors for expected auth failures (401/403)
  if ((!data.success || data.error) && !suppressApiError) {
    throw new ApiError(
      data.error?.code || 'UNKNOWN_ERROR',
      data.error?.message,
      data.error?.details,
    );
  }

  return data.data;
}
