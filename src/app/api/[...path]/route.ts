import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL || 'http://localhost:8000';

// Catch-all API route handler that proxies requests and forwards cookies
export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, await params);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, await params);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, await params);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, await params);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, await params);
}

async function proxyRequest(
  request: NextRequest,
  params: { path: string[] },
) {
  const path = params.path.join('/');
  const url = `${API_URL}/api/${path}${request.nextUrl.search}`;

  // Forward headers (excluding host)
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (key.toLowerCase() !== 'host') {
      headers.set(key, value);
    }
  });

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

  // Get response body
  const responseBody = await response.text();

  // Create the response
  const nextResponse = new NextResponse(responseBody, {
    status: response.status,
    statusText: response.statusText,
  });

  // Forward all headers including Set-Cookie
  response.headers.forEach((value, key) => {
    // Set-Cookie headers need special handling
    if (key.toLowerCase() === 'set-cookie') {
      // Split multiple Set-Cookie headers if they were concatenated
      const cookies = value.split(',').filter(c => c.trim());
      cookies.forEach(cookie => {
        // Rewrite Path attribute to root (/) so cookies are accessible across all frontend routes
        // Backend might set Path=/api but we need cookies available at /dashboard, /login, etc.
        const rewrittenCookie = cookie.trim().replace(/;\s*Path=[^;]*/i, '; Path=/');

        // If no Path was specified, add Path=/
        if (!rewrittenCookie.toLowerCase().includes('path=')) {
          nextResponse.headers.append('Set-Cookie', `${rewrittenCookie}; Path=/`);
        } else {
          nextResponse.headers.append('Set-Cookie', rewrittenCookie);
        }
      });
    } else {
      nextResponse.headers.set(key, value);
    }
  });

  return nextResponse;
}
