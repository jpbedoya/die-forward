import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use Turbopack (Next.js 16 default)
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [
      {
        // Apply CORS headers to every API route — global, no per-route patching needed.
        // Covers all responses including error paths (4xx/5xx) that previously lacked them.
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin',  value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/slides',
        destination: '/slides/index.html',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
