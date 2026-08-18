import type { HttpTypes } from "@medusajs/types"
import { describe, expect, it, vi } from "vitest"
import { PRODUCT_DETAIL_FIELDS } from "./product-query-config"
import {
  type ProductRouteSourceDependencies,
  type ProductRouteSourceMarketBinding,
  readProductRouteSource,
} from "./product-route-source"

const binding: ProductRouteSourceMarketBinding = {
  countryCode: "SK",
  locale: "sk-SK",
  market: "sk",
  publishableApiKey: "pk_sk",
  regionId: "reg_sk",
  salesChannelId: "sc_sk",
}

const product = {
  id: "prod_1",
  handle: "backend-handle",
  title: "Product",
  variants: [{ id: "variant_1", sku: "SKU-1" }],
} as HttpTypes.StoreProduct

const dependencies = (
  retrieveProduct: ProductRouteSourceDependencies["retrieveProduct"]
): ProductRouteSourceDependencies => ({
  resolveMarket: vi.fn(() => binding),
  retrieveProduct,
})

const statusError = (status: number) =>
  Object.assign(new Error(`HTTP ${status}`), { status })

describe("readProductRouteSource", () => {
  it("reads a product by stable ID with the exact market pricing and locale context", async () => {
    const retrieveProduct = vi.fn().mockResolvedValue({ product })

    const result = await readProductRouteSource(
      { market: "sk", productId: "prod_1" },
      dependencies(retrieveProduct)
    )

    expect(result).toEqual({ kind: "found", value: product })
    expect(retrieveProduct).toHaveBeenCalledWith({
      binding,
      productId: "prod_1",
      query: {
        country_code: "sk",
        fields: PRODUCT_DETAIL_FIELDS,
        locale: "sk-SK",
        region_id: "reg_sk",
      },
    })
  })

  it("returns invalid-response when the requested market is not enabled", async () => {
    const retrieveProduct = vi.fn()

    const result = await readProductRouteSource(
      { market: "ro", productId: "prod_1" },
      {
        resolveMarket: vi.fn(() => null),
        retrieveProduct,
      }
    )

    expect(result).toEqual({
      kind: "invalid-response",
      causeCode: "MISSING_MARKET_BINDING",
    })
    expect(retrieveProduct).not.toHaveBeenCalled()
  })

  it.each([
    404, 410,
  ])("maps definitive Medusa HTTP %s according to the source contract", async (status) => {
    const result = await readProductRouteSource(
      { market: "sk", productId: "prod_1" },
      dependencies(vi.fn().mockRejectedValue(statusError(status)))
    )

    expect(result).toEqual(
      status === 404
        ? { kind: "missing" }
        : {
            kind: "invalid-response",
            causeCode: "MEDUSA_REJECTED_REQUEST",
          }
    )
  })

  it.each([
    408, 425, 429, 500, 503,
  ])("maps retryable Medusa HTTP %s to unavailable", async (status) => {
    const result = await readProductRouteSource(
      { market: "sk", productId: "prod_1" },
      dependencies(vi.fn().mockRejectedValue(statusError(status)))
    )

    expect(result).toEqual({ kind: "unavailable" })
  })

  it("maps a transport failure to unavailable", async () => {
    const result = await readProductRouteSource(
      { market: "sk", productId: "prod_1" },
      dependencies(vi.fn().mockRejectedValue(new TypeError("fetch failed")))
    )

    expect(result).toEqual({ kind: "unavailable" })
  })

  it.each([
    null,
    {},
    { product: null },
    { product: { id: "prod_1" } },
    {
      product: {
        id: "prod_1",
        title: "Product",
        variants: [{ id: "variant_1" }],
      },
    },
    {
      product: {
        handle: "backend-handle",
        id: "prod_1",
        variants: [{ id: "variant_1" }],
      },
    },
    { product: { id: "prod_1", variants: [null] } },
  ])("maps malformed Medusa payload %o to invalid-response", async (payload) => {
    const result = await readProductRouteSource(
      { market: "sk", productId: "prod_1" },
      dependencies(vi.fn().mockResolvedValue(payload))
    )

    expect(result).toEqual({
      kind: "invalid-response",
      causeCode: "INVALID_MEDUSA_PRODUCT_RESPONSE",
    })
  })

  it("maps a mismatched product identity to invalid-response", async () => {
    const result = await readProductRouteSource(
      { market: "sk", productId: "prod_expected" },
      dependencies(vi.fn().mockResolvedValue({ product }))
    )

    expect(result).toEqual({
      kind: "invalid-response",
      causeCode: "INVALID_MEDUSA_PRODUCT_RESPONSE",
    })
  })
})
