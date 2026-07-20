import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  ...(process.env.NEXT_DISABLE_STANDALONE === 'true' ? {} : { output: 'standalone' as const }),
  poweredByHeader: false,
  reactStrictMode: true,
  headers() {
    return Promise.resolve([
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ]);
  },
};

export default nextConfig;
