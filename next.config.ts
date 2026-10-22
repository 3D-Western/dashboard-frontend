import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: process.env.NEXT_OUTPUT === 'standalone' ? 'standalone' : undefined,
  // Dev only: let phones/laptops on the same home or campus network open the dev server by IP
  // (e.g. http://192.168.x.x:3000). Without this, Next blocks its dev scripts for any host other
  // than localhost, so the page never becomes interactive (forms reload, buttons do nothing).
  allowedDevOrigins: ['192.168.*.*', '10.*.*.*'],
  // Different on every build, so /sw.js changes with each deploy and phones pick up the new
  // service worker (see src/lib/pwa/service-worker-source.ts).
  env: {
    SW_VERSION: process.env.GITHUB_SHA ?? process.env.VERCEL_GIT_COMMIT_SHA ?? String(Date.now()),
  },
};

export default nextConfig;
