import { join } from "node:path"
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  allowedDevOrigins: ["n1.medusa.localhost"],
  reactStrictMode: true,
  output: "standalone",
  transpilePackages: ["@new-engine/ui", "@techsio/analytics"],
  reactCompiler: true,
  cacheComponents: true,
  outputFileTracingRoot: join(__dirname, "../../"),
  outputFileTracingExcludes: {
    "*": [
      "node_modules/@swc/core-linux-x64-gnu",
      "node_modules/@swc/core-linux-x64-musl",
      "node_modules/@esbuild",
      "node_modules/@rspack",
      "node_modules/webpack",
      "node_modules/rollup",
      "node_modules/terser",
      "node_modules/uglify-js",
      "node_modules/@zag-js",
      "node_modules/puppeteer",
    ],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pub-adde8a563e2c43f7b6bc296d81c86358.r2.dev",
      },
    ],
    qualities: [40, 50, 60, 75, 90],
  },

  cacheLife: {
    product: {
      stale: 3600,
      revalidate: 3600,
      expire: 86_400,
    },
  },

  experimental: {
    typedEnv: true,
  },

  // Security headers
  headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
          ...(process.env.NODE_ENV === "production"
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=31536000; includeSubDomains",
                },
              ]
            : []),
        ],
      },
    ]
  },
}

export default nextConfig
