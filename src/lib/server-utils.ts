import { ApiError } from '@/api/client/errors';
import { redirect } from 'next/navigation';

/**
 * Wraps an async server-side data fetching function with session error handling.
 * If the function throws a session-related error, redirects to login.
 * Other errors are re-thrown to be caught by error boundaries.
 *
 * @example
 * ```tsx
 * export default async function Page() {
 *   const data = await withSessionErrorHandling(() => getPrintJobs());
 *   return <div>{data}</div>;
 * }
 * ```
 */
export async function withSessionErrorHandling<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    // If this is a session error, redirect to login
    if (
      error instanceof ApiError &&
      (error.code === 'SESSION_INVALID' ||
        error.code === 'SESSION_EXPIRED' ||
        error.code === 'UNAUTHORIZED')
    ) {
      redirect('/login?error=unauthenticated');
    }
    // Re-throw other errors to be caught by error boundaries
    throw error;
  }
}
