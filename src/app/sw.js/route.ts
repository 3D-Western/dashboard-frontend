import { buildServiceWorkerSource } from '@/lib/pwa/service-worker-source';

// Built once per deploy: SW_VERSION is set in next.config.ts, so each build serves a different
// worker and browsers pick it up.
export const dynamic = 'force-static';

export function GET() {
  return new Response(buildServiceWorkerSource(process.env.SW_VERSION ?? 'dev'), {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      // Always revalidate, so a deploy is seen at once
      'Cache-Control': 'no-cache, max-age=0, must-revalidate',
      // The worker lives at /sw.js but controls the whole site
      'Service-Worker-Allowed': '/',
    },
  });
}
