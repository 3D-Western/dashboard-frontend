// Headers the Next.js proxy (src/app/api/[...path]/route.ts) adds for the backend's auth protection
// (P-159). The backend believes X-Client-IP only from a request that carries the right
// X-Proxy-Secret, so the browser must never be able to set either one: they are removed from the
// incoming request, then set here from server-only values.

export const PROXY_SECRET_HEADER = 'X-Proxy-Secret';
export const CLIENT_IP_HEADER = 'X-Client-IP';

/** The address of the browser as the hosting platform reports it: first of Vercel's, then real-ip, then forwarded-for. */
const ADDRESS_HEADERS = ['x-vercel-forwarded-for', 'x-real-ip', 'x-forwarded-for'] as const;

/** The first entry of the first address header present (a proxy chain lists the client first). */
export function clientAddressOf(incoming: Headers): string | null {
  for (const name of ADDRESS_HEADERS) {
    const first = incoming.get(name)?.split(',')[0]?.trim();
    if (first) return first;
  }
  return null;
}

/**
 * Sets X-Proxy-Secret (only when the server has AUTH_PROXY_SECRET) and X-Client-IP on the headers
 * the proxy forwards. Anything the browser sent under those two names is removed first, so a client
 * can never choose its own address or present the secret.
 */
export function setProxyAuthHeaders(
  headers: Headers,
  incoming: Headers,
  proxySecret: string | undefined,
): void {
  headers.delete(PROXY_SECRET_HEADER);
  headers.delete(CLIENT_IP_HEADER);
  if (proxySecret) headers.set(PROXY_SECRET_HEADER, proxySecret);
  const address = clientAddressOf(incoming);
  if (address) headers.set(CLIENT_IP_HEADER, address);
}
