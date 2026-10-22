import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

describe('GET /session/reset', () => {
  it('deletes the auth cookies and redirects to login', () => {
    const request = new NextRequest('https://example.com/session/reset', {
      headers: { Cookie: 'sessionToken=stale; mfaToken=stale' },
    });

    const response = GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('Location')).toBe(
      'https://example.com/login?error=unauthenticated',
    );
    const setCookies = response.headers.getSetCookie();
    for (const name of ['sessionToken', 'mfaToken']) {
      const cookie = setCookies.find((c) => c.startsWith(`${name}=`));
      expect(cookie).toMatch(/Path=\//);
      expect(cookie).toMatch(/Expires=Thu, 01 Jan 1970/);
    }
  });
});
