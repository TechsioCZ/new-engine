import { join } from "node:path"
import type { NextConfig } from "next"

const isProduction = process.env.NODE_ENV === "production"
const strictTransportSecurityValue = [
  "max-age=31536000",
  "includeSubDomains",
].join("; ")
const permissionsPolicyValue = [
  "camera=()",
  "microphone=()",
  "geolocation=(self)",
  "payment=()",
  "usb=()",
  "serial=()",
  "browsing-topics=()",
].join(", ")

function buildContentSecurityPolicy() {
  const scriptSrc = [
    "'self'",
    // Next.js App Router currently emits inline bootstrap/runtime scripts.
    "'unsafe-inline'",
    ...(isProduction ? [] : ["'unsafe-eval'"]),
    "https://www.googletagmanager.com",
    "https://connect.facebook.net",
    "https://www.lhinsights.com",
    "https://heureka.cz",
    "https://heureka.sk",
    "https://www.ppl.cz",
  ]

  const styleSrc = [
    "'self'",
    // Inline styles are present in the current storefront HTML output.
    "'unsafe-inline'",
    "https://www.ppl.cz",
  ]

  const connectSrc = [
    "'self'",
    ...(isProduction ? [] : ["ws:", "wss:"]),
    "https:",
  ]

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    `script-src ${scriptSrc.join(" ")}`,
    `style-src ${styleSrc.join(" ")}`,
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src ${connectSrc.join(" ")}`,
    "frame-src 'self' https:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    ...(isProduction ? ["upgrade-insecure-requests"] : []),
  ].join("; ")
}

const contentSecurityPolicy = buildContentSecurityPolicy()

const nextConfig: NextConfig = {
  allowedDevOrigins: ["n1.medusa.localhost"],
  reactStrictMode: true,
  output: "standalone",
  poweredByHeader: false,
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
            value: "strict-origin-when-cross-origin",
          },
          {
            // Preserves opener isolation without breaking legitimate popup flows.
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
          {
            key: "Origin-Agent-Cluster",
            value: "?1",
          },
          {
            key: "X-Permitted-Cross-Domain-Policies",
            value: "none",
          },
          {
            key: "Permissions-Policy",
            value: permissionsPolicyValue,
          },
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy,
          },
          ...(isProduction
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: strictTransportSecurityValue,
                },
              ]
            : []),
        ],
      },
    ]
  },
}

export default nextConfig
