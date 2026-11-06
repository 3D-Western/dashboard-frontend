import { describe, it, expect } from 'vitest';
import { clientAddressOf, setProxyAuthHeaders } from './proxy-headers';

describe('setProxyAuthHeaders', () => {
  it('sets the server secret and the first address of x-vercel-forwarded-for', () => {
    const incoming = new Headers({ 'x-vercel-forwarded-for': '203.0.113.9, 10.0.0.1' });
    const headers = new Headers();

    setProxyAuthHeaders(headers, incoming, 'server-secret');

    expect(headers.get('X-Proxy-Secret')).toBe('server-secret');
    expect(headers.get('X-Client-IP')).toBe('203.0.113.9');
  });

  it('takes the address from x-real-ip, then the first x-forwarded-for entry, when Vercel gives none', () => {
    const realIp = new Headers();
    setProxyAuthHeaders(realIp, new Headers({ 'x-real-ip': '198.51.100.4' }), undefined);
    expect(realIp.get('X-Client-IP')).toBe('198.51.100.4');

    const forwarded = new Headers();
    setProxyAuthHeaders(
      forwarded,
      new Headers({ 'x-forwarded-for': '192.0.2.7, 10.0.0.2' }),
      undefined,
    );
    expect(forwarded.get('X-Client-IP')).toBe('192.0.2.7');
  });

  it('replaces a secret and an address the browser sent with the real ones', () => {
    // The forwarded headers already carry what the browser sent under those names
    const headers = new Headers({ 'X-Proxy-Secret': 'forged', 'X-Client-IP': '1.2.3.4' });

    setProxyAuthHeaders(
      headers,
      new Headers({ 'x-vercel-forwarded-for': '203.0.113.9' }),
      'server-secret',
    );

    expect(headers.get('X-Proxy-Secret')).toBe('server-secret');
    expect(headers.get('X-Client-IP')).toBe('203.0.113.9');
  });

  it('removes a forged secret and address when no secret is configured and no address is known', () => {
    const headers = new Headers({ 'X-Proxy-Secret': 'forged', 'X-Client-IP': '1.2.3.4' });

    setProxyAuthHeaders(headers, new Headers(), undefined);

    expect(headers.has('X-Proxy-Secret')).toBe(false);
    expect(headers.has('X-Client-IP')).toBe(false);
  });

  it('never sends an empty secret', () => {
    const headers = new Headers();
    setProxyAuthHeaders(headers, new Headers(), '');
    expect(headers.has('X-Proxy-Secret')).toBe(false);
  });
});

describe('clientAddressOf', () => {
  it('is null when no address header is present', () => {
    expect(clientAddressOf(new Headers({ host: 'example.test' }))).toBeNull();
  });
});
