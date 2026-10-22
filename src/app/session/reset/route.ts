import { NextRequest, NextResponse } from 'next/server';
import { Routes } from '@/lib/routes';

/** The auth cookies apiRequest forwards to the backend (see src/api/client/base.ts). */
const AUTH_COOKIES = ['sessionToken', 'mfaToken'];

/**
 * Forgets a session the backend no longer accepts (its user was deleted, the account was locked,
 * ...). Server components cannot change cookies, so layouts redirect here instead. Without this
 * the stale cookie is sent with every request until it expires.
 *
 * It only deletes the cookies in this browser; the backend has already rejected the session.
 */
export function GET(request: NextRequest) {
  const response = NextResponse.redirect(
    new URL(`${Routes.login}?error=unauthenticated`, request.url),
  );
  // The API proxy rewrites every auth cookie to Path=/, which delete() also uses
  for (const name of AUTH_COOKIES) {
    response.cookies.delete(name);
  }
  return response;
}
