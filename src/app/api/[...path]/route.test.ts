import { describe, it, expect, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

afterEach(() => vi.unstubAllGlobals());

const ctx = (path: string[]) => ({ params: Promise.resolve({ path }) });

describe('API proxy', () => {
  it('passes a live event stream through as it arrives instead of holding it back', async () => {
    const encoder = new TextEncoder();
    let finish: () => void = () => {};
    const upstream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"seq":1}\n\n'));
        // The stream stays open, as a live job feed does
        finish = () => controller.close();
      },
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(upstream, {
          headers: { 'Content-Type': 'text/event-stream', 'Content-Length': '999' },
        }),
      ),
    );

    const response = await GET(
      new NextRequest('http://localhost/api/v1/jobs/j1/pipeline/stream', {
        headers: { Accept: 'text/event-stream' },
      }),
      ctx(['v1', 'jobs', 'j1', 'pipeline', 'stream']),
    );

    expect(response.headers.get('Content-Type')).toContain('text/event-stream');
    expect(response.headers.get('Cache-Control')).toBe('no-cache, no-transform');
    expect(response.headers.get('Content-Length')).toBeNull();
    const reader = response.body!.getReader();
    const first = await reader.read();
    expect(new TextDecoder().decode(first.value)).toBe('data: {"seq":1}\n\n');
    finish();
    expect((await reader.read()).done).toBe(true);
  });

  it('still buffers and forwards an ordinary JSON response', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response('{"success":true}', { headers: { 'Content-Type': 'application/json' } }),
        ),
    );

    const response = await GET(
      new NextRequest('http://localhost/api/v1/jobs'),
      ctx(['v1', 'jobs']),
    );

    expect(await response.text()).toBe('{"success":true}');
    expect(response.headers.get('Cache-Control')).toBeNull();
  });
});
