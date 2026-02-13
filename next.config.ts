import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use Turbopack (Next.js 16 default)
  turbopack: {},
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
