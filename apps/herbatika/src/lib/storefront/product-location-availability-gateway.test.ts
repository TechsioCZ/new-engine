import { describe, expect, it, vi } from "vitest"
import type { MarketRuntimeBinding } from "@/lib/market/market-runtime"
import {
  handleProductLocationAvailabilityGatewayRequest,
  type ProductLocationAvailabilityGatewayReadResult,
} from "./product-location-availability-gateway"

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
    product_id: "prod_1",
    variants: [],
  },
} as const satisfies ProductLocationAvailabilityGatewayReadResult

const createRequest = (query: string, host: string | null = "herbatica.cz") =>
  new Request(`https://internal.test/api/location-availability?${query}`, {
    headers: host ? { host } : undefined,
  })

describe("handleProductLocationAvailabilityGatewayRequest", () => {
  it("uses the trusted host binding and forwards only product identity", async () => {
    const readProductLocationAvailability = vi
      .fn()
      .mockResolvedValue(FOUND_RESULT)
    const response = await handleProductLocationAvailabilityGatewayRequest(
      createRequest("product_id=prod_cz_1"),
      {
        readProductLocationAvailability,
        resolveMarket: (host) =>
          host === "herbatica.cz" ? MARKET_BINDING : null,
      }
    )

    expect(response.status).toBe(200)
    expect(response.headers.get("cache-control")).toBe(
      "private, no-store, max-age=0"
    )
    expect(response.headers.get("vary")).toBeNull()
    expect(await response.json()).toEqual(FOUND_RESULT.value)
    expect(readProductLocationAvailability).toHaveBeenCalledWith({
      binding: MARKET_BINDING,
      productId: "prod_cz_1",
      signal: expect.any(AbortSignal),
    })
  })

  it("fails closed on an unknown authority before reading Medusa", async () => {
    const readProductLocationAvailability = vi.fn()
    const request = createRequest("product_id=prod_1", "unknown.example")
    request.headers.set("x-forwarded-host", "herbatica.cz")
    const response = await handleProductLocationAvailabilityGatewayRequest(
      request,
      {
        readProductLocationAvailability,
        resolveMarket: (host) =>
          host === "herbatica.cz" ? MARKET_BINDING : null,
      }
    )

    expect(response.status).toBe(421)
    expect(readProductLocationAvailability).not.toHaveBeenCalled()
  })

  it.each([
    "product_id=prod_1&market=sk",
    "product_id=prod_1&region_id=reg_sk",
    "product_id=prod_1&sales_channel_id=sc_sk",
    "product_id=prod_1&product_id=prod_2",
    "product_id=",
    "product_id=prod%2F1",
    `product_id=${"a".repeat(256)}`,
  ])("rejects a non-canonical query: %s", async (query) => {
    const readProductLocationAvailability = vi.fn()
    const response = await handleProductLocationAvailabilityGatewayRequest(
      createRequest(query),
      {
        readProductLocationAvailability,
        resolveMarket: () => MARKET_BINDING,
      }
    )

    expect(response.status).toBe(400)
    expect(readProductLocationAvailability).not.toHaveBeenCalled()
  })

  it.each([
    [{ kind: "missing" }, 404],
    [{ kind: "rate-limited" }, 429],
    [{ kind: "unavailable" }, 503],
    [{ causeCode: "invalid-json", kind: "invalid-response" }, 503],
  ] as const)("maps source result %o to %s", async (sourceResult, status) => {
    const response = await handleProductLocationAvailabilityGatewayRequest(
      createRequest("product_id=prod_1"),
      {
        readProductLocationAvailability: async () => sourceResult,
        resolveMarket: () => MARKET_BINDING,
      }
    )

    expect(response.status).toBe(status)
    expect(response.headers.get("cache-control")).toBe(
      "private, no-store, max-age=0"
    )
  })

  it("hides runtime and transport errors behind a 503 response", async () => {
    const response = await handleProductLocationAvailabilityGatewayRequest(
      createRequest("product_id=prod_1"),
      {
        readProductLocationAvailability: () =>
          Promise.reject(new Error("secret upstream detail")),
        resolveMarket: () => MARKET_BINDING,
      }
    )

    expect(response.status).toBe(503)
    expect(await response.text()).not.toContain("secret upstream detail")
  })
})
