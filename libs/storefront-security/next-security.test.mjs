import assert from "node:assert/strict"
import test from "node:test"
import {
  buildDevHmrOrigins,
  buildStorefrontContentSecurityPolicy,
  createStorefrontSecurityConfig,
  resolvePublicBackendOrigin,
  resolveStorefrontSecurityPreset,
} from "./next-security.mjs"

const MISSING_BACKEND_URL_PATTERN = /Missing NEXT_PUBLIC_MEDUSA_BACKEND_URL/
const INVALID_BACKEND_URL_PATTERN = /Invalid NEXT_PUBLIC_MEDUSA_BACKEND_URL/
const UNKNOWN_PRESET_PATTERN = /Unknown storefront security preset/

test("resolvePublicBackendOrigin falls back to localhost in development", () => {
  assert.equal(
    resolvePublicBackendOrigin({
      isProduction: false,
      publicBackendUrl: undefined,
    }),
    "http://localhost:9000"
  )
})

test("resolvePublicBackendOrigin fails fast in production when missing", () => {
  assert.throws(
    () =>
      resolvePublicBackendOrigin({
        isProduction: true,
        publicBackendUrl: undefined,
      }),
    MISSING_BACKEND_URL_PATTERN
  )
})

test("resolvePublicBackendOrigin fails fast in production when invalid", () => {
  assert.throws(
    () =>
      resolvePublicBackendOrigin({
        isProduction: true,
        publicBackendUrl: "not-a-url",
      }),
    INVALID_BACKEND_URL_PATTERN
  )
})

test("buildDevHmrOrigins includes explicit custom host and :3000 variants", () => {
  const origins = buildDevHmrOrigins({
    isProduction: false,
    allowedDevOrigins: ["n1.medusa.localhost"],
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

test("medusaStorefront preset includes backend origin and dev HMR in CSP", () => {
  const preset = resolveStorefrontSecurityPreset({
    preset: "medusaStorefront",
    isProduction: false,
    publicBackendOrigin: "https://demo-medusa.example.com",
    allowedDevOrigins: ["n1.medusa.localhost"],
  })

  const csp = buildStorefrontContentSecurityPolicy({ csp: preset.csp })

  assert.match(csp, /connect-src 'self' https:\/\/demo-medusa\.example\.com/)
  assert.match(csp, /ws:\/\/n1\.medusa\.localhost:3000/)
  assert.match(csp, /img-src 'self' data: blob: https:/)
})

test("unknown preset fails fast", () => {
  assert.throws(
    () =>
      resolveStorefrontSecurityPreset({
        preset: /** @type {never} */ ("unknown"),
        publicBackendOrigin: "https://demo-medusa.example.com",
      }),
    UNKNOWN_PRESET_PATTERN
  )
})

test("createStorefrontSecurityConfig supports preset + extend + replace", async () => {
  const securityConfig = createStorefrontSecurityConfig({
    preset: "medusaStorefront",
    isProduction: false,
    publicBackendUrl: "https://demo-medusa.example.com",
    extend: {
      csp: {
        scriptSrc: ["https://www.googletagmanager.com"],
        frameSrc: ["https://www.ppl.cz"],
      },
      headers: [{ key: "Cache-Control", value: "public, max-age=60" }],
    },
    replace: {
      permissionsPolicy: ["camera=()", "microphone=()"],
    },
  })

  const headerGroups = await securityConfig.headers()
  const responseHeaders = headerGroups[0].headers
  const cspHeader = responseHeaders.find(
    (header) => header.key === "Content-Security-Policy"
  )
  const permissionsHeader = responseHeaders.find(
    (header) => header.key === "Permissions-Policy"
  )
  const cacheControlHeader = responseHeaders.find(
    (header) => header.key === "Cache-Control"
  )

  assert.equal(headerGroups[0].source, "/:path*")
  assert.equal(securityConfig.poweredByHeader, false)
  assert.match(
    cspHeader?.value ?? "",
    /script-src 'self' 'unsafe-inline' 'unsafe-eval' https:\/\/www\.googletagmanager\.com/
  )
  assert.match(cspHeader?.value ?? "", /frame-src 'self' https:\/\/www\.ppl\.cz/)
  assert.equal(permissionsHeader?.value, "camera=(), microphone=()")
  assert.equal(cacheControlHeader?.value, "public, max-age=60")
})

test("legacy additional* options still extend the preset", async () => {
  const securityConfig = createStorefrontSecurityConfig({
    isProduction: false,
    publicBackendUrl: "https://demo-medusa.example.com",
    additionalConnectSrc: ["https://www.google-analytics.com"],
  })

  const cspHeader = (await securityConfig.headers())[0].headers.find(
    (header) => header.key === "Content-Security-Policy"
  )

  assert.match(cspHeader?.value ?? "", /https:\/\/www\.google-analytics\.com/)
})
