import type { NextConfig } from 'next';

const API_URL = process.env.API_URL || 'http://127.0.0.1:8000';

const nextConfig: NextConfig = {
  output: process.env.NEXT_OUTPUT === 'standalone' ? 'standalone' : undefined,
  rewrites: async () => {
    return [
      {
        source: '/api/:path*',
        destination: `${API_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
