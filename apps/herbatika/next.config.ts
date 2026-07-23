import { join } from "node:path"

import type { NextConfig } from "next"

type ImageRemotePattern = {
  protocol: "http" | "https"
  hostname: string
}

const LOOPBACK_IMAGE_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"])

const resolveImageRemotePattern = (baseUrl: string | undefined) => {
  if (!baseUrl) {
    return []
  }

  try {
    const parsedUrl = new URL(baseUrl)
    const protocol = parsedUrl.protocol === "http:" ? "http" : "https"

    return [
      {
        protocol,
        hostname: parsedUrl.hostname,
      },
    ] as const
  } catch {
    return []
  }
}

const resolveMedusaImageRemotePattern = () =>
  resolveImageRemotePattern(process.env["NEXT_PUBLIC_MEDUSA_BACKEND_URL"])

const resolvePayloadImageRemotePattern = () =>
  resolveImageRemotePattern(process.env["NEXT_PUBLIC_PAYLOAD_BASE_URL"])

const imageRemotePatterns: ImageRemotePattern[] = [
  {
    protocol: "https",
    hostname: "cdn.myshoptet.com", // Herbatika CDN
  },
  {
    protocol: "https",
    hostname: "images.unsplash.com",
  },
  ...resolveMedusaImageRemotePattern(),
  ...resolvePayloadImageRemotePattern(),
]

const shouldDisableImageOptimization = imageRemotePatterns.some(
  ({ hostname }) => LOOPBACK_IMAGE_HOSTNAMES.has(hostname)
)

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  output: "standalone",
  transpilePackages: ["@techsio/ui-kit", "@techsio/storefront-data"],
  reactCompiler: true,
  cacheComponents: true,
  outputFileTracingRoot: join(__dirname, "../../"),
  outputFileTracingExcludes: {
    "*": [
      "node_modules/@swc/core-linux-x64-gnu",
      "node_modules/@swc/core-linux-x64-musl",
      "node_modules/@esbuild",
      "node_modules/@swc/core-linux-x64-musl",
      "node_modules/@esbuild",
      "node_modules/@rspack",
      "node_modules/webpack",
      "node_modules/rollup",
      "node_modules/terser",
      "node_modules/uglify-js",
      "node_modules/@zag-js",
      "node_modules/puppeteer",
      "node_modules/@playwright",
    ],
  },
  images: {
    // Browser-facing loopback URLs cannot be resolved correctly by the Next
    // image optimizer from inside Docker. Non-loopback deployments stay optimized.
    unoptimized: shouldDisableImageOptimization,
    remotePatterns: imageRemotePatterns,
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
}

export default nextConfig
