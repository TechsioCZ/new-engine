import { join } from "node:path"

import type { NextConfig } from "next"
import createNextIntlPlugin from "next-intl/plugin"

const withNextIntl = createNextIntlPlugin()

interface ImageRemotePattern {
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
        hostname: parsedUrl.hostname,
        protocol,
      },
    ] as const
  } catch {
    return []
  }
}

const resolveMedusaImageRemotePattern = () =>
  resolveImageRemotePattern(process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL)

const resolvePayloadImageRemotePattern = () =>
  resolveImageRemotePattern(process.env.NEXT_PUBLIC_PAYLOAD_BASE_URL)

const imageRemotePatterns: ImageRemotePattern[] = [
  {
    hostname: "cdn.myshoptet.com", // Herbatika CDN
    protocol: "https",
  },
  {
    hostname: "images.unsplash.com",
    protocol: "https",
  },
  ...resolveMedusaImageRemotePattern(),
  ...resolvePayloadImageRemotePattern(),
]

const shouldDisableImageOptimization = imageRemotePatterns.some(
  ({ hostname }) => LOOPBACK_IMAGE_HOSTNAMES.has(hostname)
)

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "herbatica.sk",
    "herbatica.cz",
    "herbatica.hu",
    "herbatica.ro",
  ],
  cacheComponents: true,
  cacheLife: {
    product: {
      expire: 86_400,
      revalidate: 3600,
      stale: 3600,
    },
  },
  experimental: {
    typedEnv: true,
  },
  images: {
    // Browser-facing loopback URLs cannot be resolved correctly by the Next
    // image optimizer from inside Docker. Non-loopback deployments stay optimized.
    unoptimized: shouldDisableImageOptimization,
    remotePatterns: imageRemotePatterns,
    qualities: [40, 50, 60, 75, 90],
  },
  output: "standalone",
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
  outputFileTracingRoot: join(__dirname, "../../"),
  reactCompiler: true,
  reactStrictMode: true,
  transpilePackages: [
    "@techsio/ui-kit",
    "@techsio/storefront-data",
    "@techsio/storefront-i18n",
  ],
  typedRoutes: true,
}

export default withNextIntl(nextConfig)
