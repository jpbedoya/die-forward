import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
