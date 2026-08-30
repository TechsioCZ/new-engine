import { describe, expect, it, vi } from "vitest"
import type { MarketRuntimeBinding } from "@/lib/market/market-runtime"
import { createProductLocationAvailabilityMedusaReader } from "./product-location-availability-medusa-reader"

const BINDING: MarketRuntimeBinding = {
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

const RESPONSE = {
  product_id: "prod_cz_1",
  variants: [
    {
      variant_id: "variant_1",
      location_availability: [
        {
          location_id: "sloc_1",
          location_name: "Praha",
          available_quantity: 4,
        },
      ],
    },
  ],
}

describe("createProductLocationAvailabilityMedusaReader", () => {
  it("creates a market-keyed client and sends only trusted channel context", async () => {
    const requestAbort = new AbortController()
    const timeoutAbort = new AbortController()
    const fetch = vi.fn().mockResolvedValue(RESPONSE)
    const createClient = vi.fn(() => ({ fetch }))
    const read = createProductLocationAvailabilityMedusaReader({
      baseUrl: "http://medusa.internal:9000",
      createClient,
      createTimeoutSignal: () => timeoutAbort.signal,
    })

    await expect(
      read({
        binding: BINDING,
        productId: "prod_cz_1",
        signal: requestAbort.signal,
      })
    ).resolves.toEqual({ kind: "found", value: RESPONSE })

    expect(createClient).toHaveBeenCalledWith({
      baseUrl: "http://medusa.internal:9000",
      publishableKey: "pk_private_cz",
    })
    expect(fetch).toHaveBeenCalledWith(
      "/store/products/prod_cz_1/location-availability",
      {
        cache: "no-store",
        query: { locale: "cs-CZ", sales_channel_id: "sc_cz" },
        signal: expect.any(AbortSignal),
      }
    )

    const requestSignal = fetch.mock.calls[0]?.[1]?.signal as AbortSignal
    expect(requestSignal.aborted).toBe(false)
    requestAbort.abort()
    expect(requestSignal.aborted).toBe(true)
  })

  it.each([
    [404, { kind: "missing" }],
    [429, { kind: "rate-limited" }],
    [400, { kind: "unavailable" }],
    [401, { kind: "unavailable" }],
    [403, { kind: "unavailable" }],
    [500, { kind: "unavailable" }],
  ] as const)("maps Medusa status %s without exposing its body", async (status, expected) => {
    const read = createProductLocationAvailabilityMedusaReader({
      baseUrl: "http://medusa.internal:9000",
      createClient: () => ({
        fetch: () =>
          Promise.reject(
            Object.assign(new Error("secret upstream detail"), { status })
          ),
      }),
    })

    await expect(
      read({
        binding: BINDING,
        productId: "prod_cz_1",
        signal: new AbortController().signal,
      })
    ).resolves.toEqual(expected)
  })

  it("does not send customer authorization and projects extra source fields", async () => {
    const fetch = vi.fn().mockResolvedValue({
      ...RESPONSE,
      internal_secret: "must-not-cross-the-boundary",
    })
    const read = createProductLocationAvailabilityMedusaReader({
      baseUrl: "http://medusa.internal:9000",
      createClient: () => ({ fetch }),
    })

    const result = await read({
      binding: BINDING,
      productId: "prod_cz_1",
      signal: new AbortController().signal,
    })

    expect(fetch.mock.calls[0]?.[1]?.headers).toBeUndefined()
    expect(result).toEqual({ kind: "found", value: RESPONSE })
    expect(JSON.stringify(result)).not.toContain("internal_secret")
  })

  it("rejects a response for a different product identity", async () => {
    const read = createProductLocationAvailabilityMedusaReader({
      baseUrl: "http://medusa.internal:9000",
      createClient: () => ({
        fetch: async () => ({ ...RESPONSE, product_id: "prod_other" }),
      }),
    })

    await expect(
      read({
        binding: BINDING,
        productId: "prod_cz_1",
        signal: new AbortController().signal,
      })
    ).resolves.toEqual({
      causeCode: "mismatched-location-availability-product",
      kind: "invalid-response",
    })
  })
})
