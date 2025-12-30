import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@techsio/ui-kit', '@techsio/analytics', '@techsio/medusa-client'],
  reactCompiler: true,
  cacheComponents: true,

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.myshoptet.com',  // Herbatika CDN
      },
    ],
    qualities: [40, 50, 60, 75, 90],
  },

  cacheLife: {
    product: {
      stale: 3600,
      revalidate: 3600,
      expire: 86400,
    },
  },

  experimental: {
    typedEnv: true,
  },
}

export default nextConfig;
