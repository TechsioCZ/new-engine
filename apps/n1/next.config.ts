import { join } from "node:path"

import type { NextConfig } from "next"

import { createStorefrontSecurityConfig } from "../../libs/storefront-security/index.mjs"

// Shared storefront hardening instead of a hand-rolled headers() block.
// The preset's CSP is suppressed for now: N1 loads third-party analytics
// (Heureka, Meta, Google, Leadhub), and the preset deliberately ships no
// vendor origins, so enforcing it as-is would block those scripts and their
// beacons. Enumerate the vendor origins into additionalScriptSrc/
// additionalConnectSrc and drop this override to turn the CSP on.
const storefrontSecurity = createStorefrontSecurityConfig({
  preset: "medusaStorefront",
  allowedDevOrigins: ["n1.medusa.localhost"],
  replace: { headers: [{ key: "Content-Security-Policy", value: null }] },
})

const nextConfig: NextConfig = {
  ...storefrontSecurity,
  reactStrictMode: true,
  typedRoutes: true,
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
    turbopackRustReactCompiler: true,
  },
}

export default nextConfig
