import { join } from "node:path"
import type { NextConfig } from "next"
import { getPublicMedusaBackendOrigin } from "./src/lib/medusa-backend-url"

const isProduction = process.env.NODE_ENV === "production"
const allowedDevOrigins = ["n1.medusa.localhost"]
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

function uniquePolicySources(sources: Array<string | null | undefined>) {
  return [
    ...new Set(sources.filter((source): source is string => Boolean(source))),
  ]
}

const publicMedusaBackendOrigin = getPublicMedusaBackendOrigin()
const devHmrOrigins = isProduction
  ? []
  : [
      "ws://localhost:3000",
      "ws://127.0.0.1:3000",
      ...allowedDevOrigins.flatMap((origin) => [
        `ws://${origin}`,
        `wss://${origin}`,
        `ws://${origin}:3000`,
        `wss://${origin}:3000`,
      ]),
    ]
const googleScriptOrigins = ["https://www.googletagmanager.com"]
const googleConnectOrigins = [
  "https://region1.google-analytics.com",
  "https://www.google-analytics.com",
]
const metaScriptOrigins = ["https://connect.facebook.net"]
const metaConnectOrigins = [
  "https://connect.facebook.net",
  "https://www.facebook.com",
]
const leadhubOrigins = ["https://www.lhinsights.com"]
const heurekaOrigins = ["https://heureka.cz", "https://heureka.sk"]
const pplOrigins = ["https://www.ppl.cz"]

function buildContentSecurityPolicy() {
  const scriptSrc = [
    "'self'",
    // Next.js App Router currently emits inline bootstrap/runtime scripts.
    "'unsafe-inline'",
    ...(isProduction ? [] : ["'unsafe-eval'"]),
    ...googleScriptOrigins,
    ...metaScriptOrigins,
    ...leadhubOrigins,
    ...heurekaOrigins,
    ...pplOrigins,
  ]

  const styleSrc = [
    "'self'",
    // Inline styles are present in the current storefront HTML output.
    "'unsafe-inline'",
    ...pplOrigins,
  ]

  const connectSrc = uniquePolicySources([
    "'self'",
    publicMedusaBackendOrigin,
    ...devHmrOrigins,
    ...googleConnectOrigins,
    ...metaConnectOrigins,
    ...leadhubOrigins,
    ...pplOrigins,
  ])
  const frameSrc = uniquePolicySources(["'self'", ...pplOrigins])

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
    `frame-src ${frameSrc.join(" ")}`,
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    ...(isProduction ? ["upgrade-insecure-requests"] : []),
  ].join("; ")
}

const contentSecurityPolicy = buildContentSecurityPolicy()

const nextConfig: NextConfig = {
  allowedDevOrigins,
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
