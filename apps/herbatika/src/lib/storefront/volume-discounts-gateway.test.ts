import { describe, expect, it, vi } from "vitest"
import type { MarketRuntimeBinding } from "@/lib/market/market-runtime"
import {
  handleVolumeDiscountGatewayRequest,
  type VolumeDiscountGatewayReadResult,
} from "./volume-discounts-gateway"

const MARKET_BINDING: MarketRuntimeBinding = {
  acceptedHosts: ["herbatica.cz"],
  canonicalOrigin: "https://herbatica.cz",
  countryCode: "CZ",
  locale: "cs-CZ",
  market: "cz",
  publishableApiKey: "pk_private_cz",
  publishableApiKeyId: "pkid_cz",
  regionId: "reg_cz",
  salesChannelId: "sc_cz",
}

const FOUND_RESULT = {
  kind: "found",
  value: {
    volume_discount_tiers: [
      {
        promotion_id: "promo_2",
        minimum_quantity: 2,
        percentage: 5,
        unit_amount: 950,
        total_amount: 1900,
        currency_code: "czk",
      },
    ],
  },
} as const satisfies VolumeDiscountGatewayReadResult

const createRequest = (query: string, host: string | null = "herbatica.cz") =>
  new Request(`https://internal.test/api/volume-discounts?${query}`, {
    headers: host ? { host } : undefined,
  })

describe("handleVolumeDiscountGatewayRequest", () => {
  it("uses the trusted host binding and forwards only the selected variant and session", async () => {
    const readVolumeDiscounts = vi.fn().mockResolvedValue(FOUND_RESULT)
    const response = await handleVolumeDiscountGatewayRequest(
      createRequest("variant_id=variant_cz_1"),
      {
        authToken: "private.session.token",
        readVolumeDiscounts,
        resolveMarket: (host) =>
          host === "herbatica.cz" ? MARKET_BINDING : null,
      }
    )

    expect(response.status).toBe(200)
    expect(response.headers.get("cache-control")).toBe(
      "private, no-store, max-age=0"
    )
    expect(await response.json()).toEqual(FOUND_RESULT.value)
    expect(readVolumeDiscounts).toHaveBeenCalledWith({
      authToken: "private.session.token",
      binding: MARKET_BINDING,
      signal: expect.any(AbortSignal),
      variantId: "variant_cz_1",
    })
    expect(JSON.stringify(FOUND_RESULT.value)).not.toContain("pk_private_cz")
    expect(JSON.stringify(FOUND_RESULT.value)).not.toContain(
      "private.session.token"
    )
  })

  it("fails closed on an unknown authority before reading Medusa", async () => {
    const readVolumeDiscounts = vi.fn()
    const request = createRequest("variant_id=variant_1", "unknown.example")
    request.headers.set("x-forwarded-host", "herbatica.cz")
    const response = await handleVolumeDiscountGatewayRequest(request, {
      authToken: null,
      readVolumeDiscounts,
      resolveMarket: (host) =>
        host === "herbatica.cz" ? MARKET_BINDING : null,
    })

    expect(response.status).toBe(421)
    expect(readVolumeDiscounts).not.toHaveBeenCalled()
  })

  it.each([
    "variant_id=variant_1&market=sk",
    "variant_id=variant_1&region_id=reg_sk",
    "variant_id=variant_1&sales_channel_id=sc_sk",
    "variant_id=variant_1&variant_id=variant_2",
    "variant_id=",
    "variant_id=variant%2F1",
    `variant_id=${"a".repeat(256)}`,
  ])("rejects a non-canonical query: %s", async (query) => {
    const readVolumeDiscounts = vi.fn()
    const response = await handleVolumeDiscountGatewayRequest(
      createRequest(query),
      {
        authToken: null,
        readVolumeDiscounts,
        resolveMarket: () => MARKET_BINDING,
      }
    )

    expect(response.status).toBe(400)
    expect(readVolumeDiscounts).not.toHaveBeenCalled()
  })

  it.each([
    [{ kind: "missing" }, 404],
    [{ kind: "rate-limited" }, 429],
    [{ kind: "rejected", status: 401 }, 401],
    [{ kind: "rejected", status: 403 }, 403],
    [{ kind: "unavailable" }, 503],
    [{ causeCode: "invalid-json", kind: "invalid-response" }, 503],
  ] as const)("maps source result %o to %s", async (sourceResult, status) => {
    const response = await handleVolumeDiscountGatewayRequest(
      createRequest("variant_id=variant_1"),
      {
        authToken: null,
        readVolumeDiscounts: async () => sourceResult,
        resolveMarket: () => MARKET_BINDING,
      }
    )

    expect(response.status).toBe(status)
    expect(response.headers.get("cache-control")).toBe(
      "private, no-store, max-age=0"
    )
  })

  it("hides runtime and transport errors behind a 503 response", async () => {
    const response = await handleVolumeDiscountGatewayRequest(
      createRequest("variant_id=variant_1"),
      {
        authToken: null,
        readVolumeDiscounts: () =>
          Promise.reject(new Error("secret upstream detail")),
        resolveMarket: () => MARKET_BINDING,
      }
    )

    expect(response.status).toBe(503)
    expect(await response.text()).not.toContain("secret upstream detail")
  })
})
