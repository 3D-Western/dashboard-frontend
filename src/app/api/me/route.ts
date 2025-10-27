import { validateSession } from '@/lib/auth';

/**
 * API route to get the current authenticated user.
 * If no user is authenticated, returns a 401 Unauthorized response.
 */
export const GET = async () => {
  const user = await validateSession();

  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  return new Response(JSON.stringify(user), { status: 200 });
};
