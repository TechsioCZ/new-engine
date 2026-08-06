import assert from "node:assert/strict"
import test from "node:test"

import {
  buildDevHmrOrigins,
  buildStorefrontContentSecurityPolicy,
  createStorefrontSecurityConfig,
  resolvePublicBackendOrigin,
  resolveStorefrontSecurityPreset,
} from "./index.mjs"

const MISSING_BACKEND_URL_PATTERN = /Missing NEXT_PUBLIC_MEDUSA_BACKEND_URL/u
const INVALID_BACKEND_URL_PATTERN = /Invalid NEXT_PUBLIC_MEDUSA_BACKEND_URL/u
const UNKNOWN_PRESET_PATTERN = /Unknown storefront security preset/u
const BACKEND_ORIGIN = "https://demo-medusa.example.com"
const CONTENT_SECURITY_POLICY_HEADER = "Content-Security-Policy"
const FRAME_OPTIONS_HEADER = "X-Frame-Options"

await test("resolvePublicBackendOrigin falls back to localhost in development", () => {
  assert.equal(
    resolvePublicBackendOrigin({
      isProduction: false,
    }),
    "http://localhost:9000",
  )
})

await test("resolvePublicBackendOrigin fails fast in production when missing", () => {
  assert.throws(
    () =>
      resolvePublicBackendOrigin({
        isProduction: true,
      }),
    MISSING_BACKEND_URL_PATTERN,
  )
})

await test("resolvePublicBackendOrigin fails fast in production when invalid", () => {
  assert.throws(
    () =>
      resolvePublicBackendOrigin({
        isProduction: true,
        publicBackendUrl: "not-a-url",
      }),
    INVALID_BACKEND_URL_PATTERN,
  )
})

await test("resolvePublicBackendOrigin honors envVarName overrides", () => {
  const originalBackendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
  const originalCustomBackendUrl = process.env.CUSTOM_MEDUSA_BACKEND_URL

  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL = "https://default.example.com"
  process.env.CUSTOM_MEDUSA_BACKEND_URL = "https://custom.example.com"

  try {
    assert.equal(
      resolvePublicBackendOrigin({
        envVarName: "CUSTOM_MEDUSA_BACKEND_URL",
        isProduction: false,
      }),
      "https://custom.example.com",
    )
  } finally {
    if (originalBackendUrl === undefined) {
      delete process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
    } else {
      process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL = originalBackendUrl
    }

    if (originalCustomBackendUrl === undefined) {
      delete process.env.CUSTOM_MEDUSA_BACKEND_URL
    } else {
      process.env.CUSTOM_MEDUSA_BACKEND_URL = originalCustomBackendUrl
    }
  }
})

await test("buildDevHmrOrigins includes explicit custom host and :3000 variants", () => {
  const origins = buildDevHmrOrigins({
    allowedDevOrigins: ["n1.medusa.localhost"],
    isProduction: false,
  })

  assert.deepEqual(origins, [
    "ws://localhost:3000",
    "ws://127.0.0.1:3000",
    "ws://n1.medusa.localhost",
    "wss://n1.medusa.localhost",
    "ws://n1.medusa.localhost:3000",
    "wss://n1.medusa.localhost:3000",
  ])
})

await test("buildDevHmrOrigins normalizes full origins and explicit ports", () => {
  const origins = buildDevHmrOrigins({
    allowedDevOrigins: ["https://shop.localhost", "shop.localhost:3100"],
    isProduction: false,
  })

  assert.deepEqual(origins, [
    "ws://localhost:3000",
    "ws://127.0.0.1:3000",
    "ws://shop.localhost",
    "wss://shop.localhost",
    "ws://shop.localhost:3000",
    "wss://shop.localhost:3000",
    "ws://shop.localhost:3100",
    "wss://shop.localhost:3100",
  ])
})

await test("medusaStorefront preset includes backend origin and dev HMR in CSP", () => {
  const preset = resolveStorefrontSecurityPreset({
    allowedDevOrigins: ["n1.medusa.localhost"],
    isProduction: false,
    preset: "medusaStorefront",
    publicBackendOrigin: BACKEND_ORIGIN,
  })

  const csp = buildStorefrontContentSecurityPolicy({ csp: preset.csp })

  assert.match(csp, /connect-src 'self' https:\/\/demo-medusa\.example\.com/u)
  assert.match(csp, /ws:\/\/n1\.medusa\.localhost:3000/u)
  assert.match(csp, /img-src 'self' data: blob: https:/u)
})

await test("unknown preset fails fast", () => {
  assert.throws(
    () =>
      resolveStorefrontSecurityPreset({
        preset: "unknown",
        publicBackendOrigin: BACKEND_ORIGIN,
      }),
    UNKNOWN_PRESET_PATTERN,
  )
})

await test("createStorefrontSecurityConfig supports preset + extend + replace", () => {
  const securityConfig = createStorefrontSecurityConfig({
    extend: {
      csp: {
        frameSrc: ["https://www.ppl.cz"],
        scriptSrc: ["https://www.googletagmanager.com"],
      },
      headers: [{ key: "Cache-Control", value: "public, max-age=60" }],
    },
    isProduction: false,
    preset: "medusaStorefront",
    publicBackendUrl: BACKEND_ORIGIN,
    replace: {
      permissionsPolicy: ["camera=()", "microphone=()"],
    },
  })

  const headerGroups = securityConfig.headers()
  const responseHeaders = headerGroups[0].headers
  const cspHeader = responseHeaders.find(
    (header) => header.key === CONTENT_SECURITY_POLICY_HEADER,
  )
  const permissionsHeader = responseHeaders.find(
    (header) => header.key === "Permissions-Policy",
  )
  const cacheControlHeader = responseHeaders.find(
    (header) => header.key === "Cache-Control",
  )

  assert.equal(headerGroups[0].source, "/:path*")
  assert.equal(securityConfig.poweredByHeader, false)
  assert.match(
    cspHeader?.value ?? "",
    /script-src 'self' 'unsafe-inline' 'unsafe-eval' https:\/\/www\.googletagmanager\.com/u,
  )
  assert.match(
    cspHeader?.value ?? "",
    /frame-src 'self' https:\/\/www\.ppl\.cz/u,
  )
  assert.equal(permissionsHeader?.value, "camera=(), microphone=()")
  assert.equal(cacheControlHeader?.value, "public, max-age=60")
})

await test("replace headers win over extend headers", () => {
  const securityConfig = createStorefrontSecurityConfig({
    extend: {
      headers: [{ key: FRAME_OPTIONS_HEADER, value: "SAMEORIGIN" }],
    },
    isProduction: false,
    publicBackendUrl: BACKEND_ORIGIN,
    replace: {
      headers: [{ key: FRAME_OPTIONS_HEADER, value: "DENY" }],
    },
  })

  const frameOptionsHeader = securityConfig
    .headers()[0]
    .headers.find((header) => header.key === FRAME_OPTIONS_HEADER)

  assert.equal(frameOptionsHeader?.value, "DENY")
})

await test("legacy additional* options still extend the preset", () => {
  const securityConfig = createStorefrontSecurityConfig({
    additionalConnectSrc: ["https://www.google-analytics.com"],
    isProduction: false,
    publicBackendUrl: BACKEND_ORIGIN,
  })

  const cspHeader = securityConfig
    .headers()[0]
    .headers.find((header) => header.key === CONTENT_SECURITY_POLICY_HEADER)

  assert.match(cspHeader?.value ?? "", /https:\/\/www\.google-analytics\.com/u)
})

await test("suppressing the CSP does not require a production backend URL", () => {
  const securityConfig = createStorefrontSecurityConfig({
    isProduction: true,
    replace: {
      headers: [{ key: CONTENT_SECURITY_POLICY_HEADER, value: null }],
    },
  })

  const [headerGroup] = securityConfig.headers()
  const { headers } = headerGroup

  assert.equal(
    headers.find((header) => header.key === CONTENT_SECURITY_POLICY_HEADER),
    undefined,
  )
  assert.ok(headers.some((header) => header.key === "Permissions-Policy"))
})
