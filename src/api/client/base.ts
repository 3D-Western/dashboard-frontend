import { ApiResponseRaw } from '../types';
import { ApiError, ErrorCodes } from './errors';
import { ensureMockServer } from './mock-server';

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
  const {
    suppressApiError = false,
    expectJson = true,
    skipContentTypeHeader = false,
  } = config || {};

  // Only set Content-Type header if:
  // 1. Not explicitly skipped
  // 2. There's a request body
  // 3. User hasn't provided their own Content-Type
  const headers: HeadersInit = { ...options.headers };
  const headersObj = new Headers(headers);

  if (!skipContentTypeHeader && options.body && !headersObj.has('Content-Type')) {
    headersObj.set('Content-Type', 'application/json');
  }

  // For server-side requests, manually forward cookies from Next.js headers
  // This is necessary because credentials: 'include' doesn't work for cross-origin
  // server-side requests in Next.js
  if (typeof window === 'undefined' && !headersObj.has('Cookie')) {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('sessionToken');
    const mfaToken = cookieStore.get('mfaToken');

    // Build cookie header with all available auth cookies
    const cookiePairs: string[] = [];
    if (sessionToken) {
      cookiePairs.push(`sessionToken=${sessionToken.value}`);
    }
    if (mfaToken) {
      cookiePairs.push(`mfaToken=${mfaToken.value}`);
    }

    if (cookiePairs.length > 0) {
      headersObj.set('Cookie', cookiePairs.join('; '));
    }
  }

  let response: Response;

  try {
    await ensureMockServer();
    response = await fetch(url, {
      ...options,
      headers: headersObj,
      credentials: 'include', // Important: Always send cookies with requests
    });
  } catch (error) {
    // Handle network-level errors (connection refused, DNS failures, etc.)
    // These are common when the backend is down or during HMR issues
    if (isDev) {
      console.error('[apiRequest] Network error:', {
        url,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    throw new ApiError(
      ErrorCodes.REQUEST_FAILED,
      `Network request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { url, originalError: error },
    );
  }

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

  let data: ApiResponseRaw<T>;

  try {
    data = await response.json();
  } catch (error) {
    // Handle JSON parsing errors
    if (isDev) {
      console.error('[apiRequest] JSON parsing error:', {
        url,
        status: response.status,
        contentType,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    throw new ApiError(
      ErrorCodes.RESPONSE_INVALID_CONTENT_TYPE,
      'Failed to parse response as JSON',
      { url, status: response.status, contentType },
    );
  }

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
