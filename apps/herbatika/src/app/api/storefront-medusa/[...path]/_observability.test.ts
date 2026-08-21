import { afterEach, describe, expect, it, vi } from "vitest"
import type { MarketRuntimeBinding } from "@/lib/market/market-runtime"
import {
  buildGatewayObservation,
  classifyGatewayRoute,
  logGatewayFailure,
  resolveRequestId,
} from "./_observability"

const REQUEST_ID = "985d1c16-3582-4b51-8e5a-b365d74d6b07"
const REQUEST_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const BINDING: MarketRuntimeBinding = {
  acceptedHosts: ["herbatica.ro"],
  canonicalOrigin: "https://herbatica.ro",
  countryCode: "RO",
  locale: "ro-RO",
  market: "ro",
  publishableApiKey: "private-key-must-not-be-observed",
  publishableApiKeyId: "pkid_ro",
  regionId: "reg_ro",
  salesChannelId: "sc_ro",
}

describe("storefront gateway observability", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it("keeps only a valid UUIDv4 request id", () => {
    expect(resolveRequestId(new Headers({ "x-request-id": REQUEST_ID }))).toBe(
      REQUEST_ID
    )
    expect(
      resolveRequestId(
        new Headers({ "x-request-id": "attacker-value-with-credentials" })
      )
    ).toMatch(REQUEST_ID_PATTERN)
  })

  it("uses bounded route classes", () => {
    expect(classifyGatewayRoute("/store/products")).toBe("catalog")
    expect(classifyGatewayRoute("/store/carts/cart_1")).toBe("cart")
    expect(classifyGatewayRoute("/store/payment-collections")).toBe("checkout")
    expect(
      classifyGatewayRoute("/private/user@example.test?token=secret")
    ).toBe("other")
  })

  it("logs structured market and release context without secrets or URLs", () => {
    vi.stubEnv("RELEASE_SHA", "a".repeat(40))
    vi.stubEnv("STOREFRONT_BUILD_HASH", "storefront-build-42")
    vi.stubEnv("ZANE_DEPLOYMENT_ID", "dpl_42")
    vi.stubEnv("ZANE_DEPLOYMENT_SLOT", "green")
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {
      // The test observes the structured payload without writing to stderr.
    })

    logGatewayFailure({
      binding: BINDING,
      failure: "upstream_unavailable",
      path: "/store/products?email=user@example.test&token=secret",
      requestId: REQUEST_ID,
    })

    const serialized = String(errorSpy.mock.calls[0]?.[0])
    expect(JSON.parse(serialized)).toEqual(
      buildGatewayObservation({
        binding: BINDING,
        failure: "upstream_unavailable",
        path: "/store/products",
        requestId: REQUEST_ID,
      })
    )
    expect(serialized).not.toContain(BINDING.publishableApiKey)
    expect(serialized).not.toContain("user@example.test")
    expect(serialized).not.toContain("token")
  })
})
