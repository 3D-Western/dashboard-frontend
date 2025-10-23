import { ApiResponseRaw } from '../types';
import { ApiError, ErrorCodes } from './errors';

const isDev = process.env.NODE_ENV === 'development';

export interface ApiRequestConfig {
  /**
   * If true, suppresses throwing ApiError for failed responses
   * @default false
   */
  suppressApiError?: boolean;

  /**
   * If true, expects the response to be JSON and throws if it's not
   * If false, returns the Response object for non-JSON responses (e.g., file downloads)
   * @default true
   */
  expectJson?: boolean;

  /**
   * If true, skips setting the Content-Type header
   * Useful for multipart/form-data where the browser sets the boundary
   * @default false
   */
  skipContentTypeHeader?: boolean;
}

export async function apiRequest<T>(
  url: string,
  options: RequestInit = {},
  config?: ApiRequestConfig,
): Promise<T> {
  const { suppressApiError = false, expectJson = true, skipContentTypeHeader = false } = config || {};

  // Only set Content-Type header if:
  // 1. Not explicitly skipped
  // 2. There's a request body
  // 3. User hasn't provided their own Content-Type
  const headers: HeadersInit = { ...options.headers };
  const headersObj = new Headers(headers);

  if (!skipContentTypeHeader && options.body && !headersObj.has('Content-Type')) {
    headersObj.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers: headersObj,
  });

  // Handle 204 No Content (common for DELETE operations)
  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('Content-Type');
  const isJson = contentType?.includes('application/json');

  if (!isJson) {
    if (expectJson) {
      throw new ApiError(
        ErrorCodes.RESPONSE_INVALID_CONTENT_TYPE,
        `Expected JSON but got ${contentType || 'no content-type'}`,
      );
    }
    // For non-JSON responses (file downloads, images, etc.), return the response itself
    // The caller can then use response.blob(), response.arrayBuffer(), etc.
    return response as unknown as T;
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
