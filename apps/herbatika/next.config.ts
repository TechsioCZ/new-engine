import { join } from "node:path"
import type { NextConfig } from "next"

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
  resolveImageRemotePattern(process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL)

const resolvePayloadImageRemotePattern = () =>
  resolveImageRemotePattern(process.env.NEXT_PUBLIC_PAYLOAD_BASE_URL)

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  transpilePackages: [
    "@techsio/smart-suggest-client",
    "@techsio/smart-suggest-core",
    "@techsio/smart-suggest-react",
    "@techsio/smart-suggest-ui",
    "@techsio/smart-suggest-validation",
    "@techsio/storefront-data",
    "@techsio/ui-kit",
  ],
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
    remotePatterns: [
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
    cpus: 1,
    webpackMemoryOptimizations: true,
  },
}

export default nextConfig
