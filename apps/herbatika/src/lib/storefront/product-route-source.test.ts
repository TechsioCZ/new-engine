import type { HttpTypes } from "@medusajs/types"
import { describe, expect, it, vi } from "vitest"
import { PRODUCT_DETAIL_FIELDS } from "./product-query-config"
import {
  type ProductRouteSourceDependencies,
  type ProductRouteSourceMarketBinding,
  readProductAlternateSource,
  readProductIdentitySource,
  readProductRouteSource,
  readProductRouteSourceByHandle,
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
} as unknown as HttpTypes.StoreProduct

const request = {
  market: "sk",
  productId: "prod_1",
  publicSlug: "vitamin-c",
} as const

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
      request,
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
      { market: "ro", productId: "prod_1", publicSlug: "vitamin-c" },
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
      request,
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
      request,
      dependencies(vi.fn().mockRejectedValue(statusError(status)))
    )

    expect(result).toEqual({ kind: "unavailable" })
  })

  it("maps a transport failure to unavailable", async () => {
    const result = await readProductRouteSource(
      request,
      dependencies(vi.fn().mockRejectedValue(new TypeError("fetch failed")))
    )

    expect(result).toEqual({ kind: "unavailable" })
  })

  it("fails closed on malformed dependency shape", async () => {
    const malformedDependencies = await readProductRouteSource(
      request,
      {} as ProductRouteSourceDependencies
    )
    const malformedBinding = await readProductRouteSource(request, {
      resolveMarket: vi.fn(
        () =>
          ({
            ...binding,
            market: "cz",
          }) as unknown as ProductRouteSourceMarketBinding
      ),
      retrieveProduct: vi.fn(),
    })

    expect(malformedDependencies).toEqual({
      kind: "invalid-response",
      causeCode: "INVALID_PRODUCT_SOURCE_DEPENDENCIES",
    })
    expect(malformedBinding).toEqual({
      kind: "invalid-response",
      causeCode: "INVALID_MARKET_BINDING",
    })
  })

  it("maps a market-binding dependency outage to unavailable", async () => {
    const result = await readProductRouteSource(request, {
      resolveMarket: vi.fn(() => {
        throw new Error("configuration dependency unavailable")
      }),
      retrieveProduct: vi.fn(),
    })

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
      request,
      dependencies(vi.fn().mockResolvedValue(payload))
    )

    expect(result).toEqual({
      kind: "invalid-response",
      causeCode: "INVALID_MEDUSA_PRODUCT_RESPONSE",
    })
  })

  it("maps a mismatched product identity to invalid-response", async () => {
    const result = await readProductRouteSource(
      { ...request, productId: "prod_expected" },
      dependencies(vi.fn().mockResolvedValue({ product }))
    )

    expect(result).toEqual({
      kind: "invalid-response",
      causeCode: "INVALID_MEDUSA_PRODUCT_RESPONSE",
    })
  })
})

describe("readProductRouteSourceByHandle", () => {
  const marketBindings = {
    sk: binding,
    cz: {
      countryCode: "CZ",
      locale: "cs-CZ",
      market: "cz",
      publishableApiKey: "pk_cz",
      regionId: "reg_cz",
      salesChannelId: "sc_cz",
    },
    hu: {
      countryCode: "HU",
      locale: "hu-HU",
      market: "hu",
      publishableApiKey: "pk_hu",
      regionId: "reg_hu",
      salesChannelId: "sc_hu",
    },
    ro: {
      countryCode: "RO",
      locale: "ro-RO",
      market: "ro",
      publishableApiKey: "pk_ro",
      regionId: "reg_ro",
      salesChannelId: "sc_ro",
    },
  } as const satisfies Record<string, ProductRouteSourceMarketBinding>

  const handleProduct = {
    handle: "vitamin-c",
    id: "prod_1",
    title: "Product",
    variants: [{ id: "variant_1", sku: "SKU-1" }],
  }

  it.each([
    "sk",
    "cz",
    "hu",
    "ro",
  ] as const)("resolves a product by handle without any publication proof for %s", async (market) => {
    const marketBinding = marketBindings[market]
    const retrieveProducts = vi
      .fn()
      .mockResolvedValue({ products: [handleProduct] })

    const result = await readProductRouteSourceByHandle(
      { market, publicSlug: "vitamin-c" },
      { resolveMarket: vi.fn(() => marketBinding), retrieveProducts }
    )

    expect(result).toEqual({ kind: "found", value: handleProduct })
    expect(retrieveProducts).toHaveBeenCalledWith({
      binding: marketBinding,
      query: {
        country_code: marketBinding.countryCode.toLowerCase(),
        fields: PRODUCT_DETAIL_FIELDS,
        handle: "vitamin-c",
        limit: 1,
        locale: marketBinding.locale,
        region_id: marketBinding.regionId,
      },
    })
  })

  it("returns missing when no product carries the handle", async () => {
    const result = await readProductRouteSourceByHandle(
      { market: "sk", publicSlug: "vitamin-c" },
      {
        resolveMarket: vi.fn(() => binding),
        retrieveProducts: vi
          .fn()
          .mockResolvedValue({ products: [{ ...handleProduct, handle: "x" }] }),
      }
    )

    expect(result).toEqual({ kind: "missing" })
  })

  it("maps malformed payloads and source outages", async () => {
    await expect(
      readProductRouteSourceByHandle(
        { market: "sk", publicSlug: "vitamin-c" },
        {
          resolveMarket: vi.fn(() => binding),
          retrieveProducts: vi
            .fn()
            .mockResolvedValue({ products: [{ ...handleProduct, title: "" }] }),
        }
      )
    ).resolves.toEqual({
      kind: "invalid-response",
      causeCode: "INVALID_MEDUSA_PRODUCT_RESPONSE",
    })
    await expect(
      readProductRouteSourceByHandle(
        { market: "sk", publicSlug: "vitamin-c" },
        {
          resolveMarket: vi.fn(() => binding),
          retrieveProducts: vi.fn().mockRejectedValue(statusError(503)),
        }
      )
    ).resolves.toEqual({ kind: "unavailable" })
    await expect(
      readProductRouteSourceByHandle(
        { market: "sk", publicSlug: "vitamin-c" },
        { resolveMarket: vi.fn(() => null), retrieveProducts: vi.fn() }
      )
    ).resolves.toEqual({
      kind: "invalid-response",
      causeCode: "INVALID_MARKET_BINDING",
    })
  })
})

describe("readProductIdentitySource", () => {
  it("uses the trusted market binding for lifecycle visibility without requiring a URLR slug", async () => {
    const retrieveProduct = vi.fn().mockResolvedValue({
      product: { id: "prod_1" },
    })

    const result = await readProductIdentitySource(
      { market: "sk", productId: "prod_1" },
      dependencies(retrieveProduct)
    )

    expect(result).toEqual({ kind: "found", value: { id: "prod_1" } })
    expect(retrieveProduct).toHaveBeenCalledWith({
      binding,
      productId: "prod_1",
      query: {
        country_code: "sk",
        fields: "id",
        locale: "sk-SK",
        region_id: "reg_sk",
      },
    })
  })

  it("retains source outage and malformed identity semantics", async () => {
    await expect(
      readProductIdentitySource(
        { market: "sk", productId: "prod_1" },
        dependencies(vi.fn().mockRejectedValue(new TypeError("fetch failed")))
      )
    ).resolves.toEqual({ kind: "unavailable" })
    await expect(
      readProductIdentitySource(
        { market: "sk", productId: "prod_1" },
        dependencies(
          vi.fn().mockResolvedValue({ product: { id: "prod_other" } })
        )
      )
    ).resolves.toEqual({
      kind: "invalid-response",
      causeCode: "INVALID_MEDUSA_PRODUCT_RESPONSE",
    })
  })
})

describe("readProductAlternateSource", () => {
  const alternateRequest = {
    ...request,
    sourceVersion: "2026-08-19T00:00:00.000Z",
  } as const

  it("confirms the product exists on the target market", async () => {
    await expect(
      readProductAlternateSource(
        alternateRequest,
        dependencies(vi.fn().mockResolvedValue({ product: { id: "prod_1" } }))
      )
    ).resolves.toEqual({ kind: "found", value: { id: "prod_1" } })
  })

  it("maps a missing alternate product and source outages", async () => {
    await expect(
      readProductAlternateSource(
        alternateRequest,
        dependencies(vi.fn().mockRejectedValue(statusError(404)))
      )
    ).resolves.toEqual({ kind: "missing" })
    await expect(
      readProductAlternateSource(
        alternateRequest,
        dependencies(vi.fn().mockRejectedValue(statusError(503)))
      )
    ).resolves.toEqual({ kind: "unavailable" })
  })
})
