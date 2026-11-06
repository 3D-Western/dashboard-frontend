import { NextRequest, NextResponse } from 'next/server';
import { setProxyAuthHeaders } from '@/lib/proxy-headers';

const API_URL = process.env.API_URL || 'http://localhost:8000';

// Catch-all API route handler that proxies requests and forwards cookies
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return proxyRequest(request, await params);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return proxyRequest(request, await params);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return proxyRequest(request, await params);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return proxyRequest(request, await params);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return proxyRequest(request, await params);
}

async function proxyRequest(request: NextRequest, params: { path: string[] }) {
  const path = params.path.join('/');
  const url = `${API_URL}/api/${path}${request.nextUrl.search}`;

  // Forward headers (excluding host and hop-by-hop headers)
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    const lowerKey = key.toLowerCase();
    if (lowerKey === 'host' || lowerKey === 'accept-encoding' || lowerKey === 'content-length') {
      return;
    }
    headers.set(key, value);
  });

  // The backend's auth limits count the real browser address, which it trusts only with this
  // secret (server-only env var, never sent to the browser). Overwrites anything the browser sent.
  setProxyAuthHeaders(headers, request.headers, process.env.AUTH_PROXY_SECRET);

  // Never advertise Brotli upstream: the runtime here cannot decompress `br`
  // responses, which makes response bodies come back empty (login returned
  // "200 OK" with no body). gzip/deflate are decoded transparently by fetch.
  headers.set('Accept-Encoding', 'gzip, deflate');

  // Get request body if present
  let body: BodyInit | undefined;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    body = await request.text();
  }

  // A live stream (the print pipeline's server-sent events) must end when the browser leaves
  const wantsStream = (request.headers.get('accept') ?? '').includes('text/event-stream');

  // Make the proxied request with credentials
  const response = await fetch(url, {
    method: request.method,
    headers,
    body,
    credentials: 'include',
    signal: wantsStream ? request.signal : undefined,
  });

  // Server-sent events are passed through as they arrive; buffering them with text() would hold
  // every event back until the stream closed, which for a live feed is never.
  const isStream = (response.headers.get('content-type') ?? '').includes('text/event-stream');

  // Get response body (fetch transparently decodes gzip/deflate)
  const responseBody = isStream ? response.body : await response.text();

  // A 204 (the analytics events endpoint answers one) has no body, and a Response may not carry
  // even an empty one with that status
  const bodyless = response.status === 204 || response.status === 205 || response.status === 304;

  // Create the response
  const nextResponse = new NextResponse(bodyless ? null : responseBody, {
    status: response.status,
    statusText: response.statusText,
  });

  // Forward all headers including Set-Cookie
  response.headers.forEach((value, key) => {
    const lowerKey = key.toLowerCase();

    // Set-Cookie headers need special handling
    if (lowerKey === 'set-cookie') {
      // Use getSetCookie() when available so cookies containing commas (e.g. the
      // Expires date "Mon, 21 Sep 2026 ...") are not split into corrupt headers.
      const cookies =
        typeof response.headers.getSetCookie === 'function'
          ? response.headers.getSetCookie()
          : [value];

      cookies.forEach((cookie) => {
        // Rewrite Path attribute to root (/) so cookies are accessible across all frontend routes
        // Backend might set Path=/api but we need cookies available at /dashboard, /login, etc.
        let rewrittenCookie = cookie.trim().replace(/;\s*Path=[^;]*/i, '; Path=/');

        // If no Path was specified, add Path=/
        if (!rewrittenCookie.toLowerCase().includes('path=')) {
          rewrittenCookie = `${rewrittenCookie}; Path=/`;
        }

        nextResponse.headers.append('Set-Cookie', rewrittenCookie);
      });
    } else if (lowerKey === 'content-encoding' || lowerKey === 'content-length') {
      // The body has already been decoded and re-serialized by this proxy.
      // Forwarding these upstream headers would make the browser misinterpret
      // the body (e.g. trying to gunzip plain text).
      return;
    } else {
      nextResponse.headers.set(key, value);
    }
  });

  if (isStream) {
    nextResponse.headers.set('Cache-Control', 'no-cache, no-transform');
    // Tell nginx-style reverse proxies not to buffer it either
    nextResponse.headers.set('X-Accel-Buffering', 'no');
  }

  return nextResponse;
}
