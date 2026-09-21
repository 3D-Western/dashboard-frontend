import { NextRequest, NextResponse } from 'next/server';

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

  // Never advertise Brotli upstream: the runtime here cannot decompress `br`
  // responses, which makes response bodies come back empty (login returned
  // "200 OK" with no body). gzip/deflate are decoded transparently by fetch.
  headers.set('Accept-Encoding', 'gzip, deflate');

  // Get request body if present
  let body: BodyInit | undefined;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    body = await request.text();
  }

  // Make the proxied request with credentials
  const response = await fetch(url, {
    method: request.method,
    headers,
    body,
    credentials: 'include',
  });

  // Get response body (fetch transparently decodes gzip/deflate)
  const responseBody = await response.text();

  // Create the response
  const nextResponse = new NextResponse(responseBody, {
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

  return nextResponse;
}
