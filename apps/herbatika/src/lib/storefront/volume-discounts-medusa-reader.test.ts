import { describe, expect, it, vi } from "vitest"
import type { MarketRuntimeBinding } from "@/lib/market/market-runtime"
import { createVolumeDiscountMedusaReader } from "./volume-discounts-medusa-reader"

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
}

describe("createVolumeDiscountMedusaReader", () => {
  it("creates a market-keyed client and sends only trusted market context", async () => {
    const requestAbort = new AbortController()
    const timeoutAbort = new AbortController()
    const fetch = vi.fn().mockResolvedValue(RESPONSE)
    const createClient = vi.fn(() => ({ fetch }))
    const read = createVolumeDiscountMedusaReader({
      baseUrl: "http://medusa.internal:9000",
      createClient,
      createTimeoutSignal: () => timeoutAbort.signal,
    })

    await expect(
      read({
        authToken: "private.session.token",
        binding: BINDING,
        signal: requestAbort.signal,
        variantId: "variant_cz_1",
      })
    ).resolves.toEqual({ kind: "found", value: RESPONSE })

    expect(createClient).toHaveBeenCalledWith({
      baseUrl: "http://medusa.internal:9000",
      publishableKey: "pk_private_cz",
    })
    expect(fetch).toHaveBeenCalledWith("/store/volume-discounts", {
      cache: "no-store",
      headers: { authorization: "Bearer private.session.token" },
      query: {
        region_id: "reg_cz",
        sales_channel_id: "sc_cz",
        variant_id: "variant_cz_1",
      },
      signal: expect.any(AbortSignal),
    })

    const requestSignal = fetch.mock.calls[0]?.[1]?.signal as AbortSignal
    expect(requestSignal.aborted).toBe(false)
    requestAbort.abort()
    expect(requestSignal.aborted).toBe(true)
  })

  it.each([
    [401, { kind: "rejected", status: 401 }],
    [403, { kind: "rejected", status: 403 }],
    [404, { kind: "missing" }],
    [429, { kind: "rate-limited" }],
    [500, { kind: "unavailable" }],
  ] as const)("maps Medusa status %s without exposing its body", async (status, expected) => {
    const read = createVolumeDiscountMedusaReader({
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
        authToken: null,
        binding: BINDING,
        signal: new AbortController().signal,
        variantId: "variant_cz_1",
      })
    ).resolves.toEqual(expected)
  })

  it("omits Authorization for a guest and aborts when the timeout fires", async () => {
    const timeoutAbort = new AbortController()
    const fetch = vi.fn().mockResolvedValue(RESPONSE)
    const read = createVolumeDiscountMedusaReader({
      baseUrl: "http://medusa.internal:9000",
      createClient: () => ({ fetch }),
      createTimeoutSignal: () => timeoutAbort.signal,
    })

    await read({
      authToken: null,
      binding: BINDING,
      signal: new AbortController().signal,
      variantId: "variant_cz_1",
    })

    const options = fetch.mock.calls[0]?.[1]
    expect(options?.headers).toBeUndefined()
    expect(options?.signal.aborted).toBe(false)
    timeoutAbort.abort()
    expect(options?.signal.aborted).toBe(true)
  })

  it("classifies extra or malformed source fields before returning them", async () => {
    const read = createVolumeDiscountMedusaReader({
      baseUrl: "http://medusa.internal:9000",
      createClient: () => ({
        fetch: async () => ({
          volume_discount_tiers: [
            {
              ...RESPONSE.volume_discount_tiers[0],
              internal_secret: "must-not-cross-the-boundary",
            },
          ],
        }),
      }),
    })

    const result = await read({
      authToken: null,
      binding: BINDING,
      signal: new AbortController().signal,
      variantId: "variant_cz_1",
    })

    expect(result).toEqual({ kind: "found", value: RESPONSE })
    expect(JSON.stringify(result)).not.toContain("internal_secret")
  })
})
