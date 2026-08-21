import type { HttpTypes } from "@medusajs/types"
import { describe, expect, it, vi } from "vitest"
import { PRODUCT_DETAIL_FIELDS } from "./product-query-config"
import {
  type ProductRouteSourceDependencies,
  type ProductRouteSourceMarketBinding,
  readProductAlternateSource,
  readProductIdentitySource,
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
  metadata: {
    url_registry_publication: {
      schemaVersion: 1,
      markets: {
        sk: {
          publicationStatus: "published",
          publicSlug: "vitamin-c",
          salesChannelId: "sc_sk",
        },
      },
    },
  },
  title: "Product",
  variants: [{ id: "variant_1", sku: "SKU-1" }],
} as unknown as HttpTypes.StoreProduct

const request = {
  market: "sk",
  productId: "prod_1",
  publicSlug: "vitamin-c",
} as const

const assignment = (
  overrides: Record<string, unknown> = {}
): Record<string, unknown> => ({
  publicationStatus: "published",
  publicSlug: "vitamin-c",
  salesChannelId: "sc_sk",
  ...overrides,
})

const publicationMetadata = (
  marketAssignment: unknown = assignment(),
  contractOverrides: Record<string, unknown> = {}
) => ({
  url_registry_publication: {
    schemaVersion: 1,
    markets: { sk: marketAssignment },
    ...contractOverrides,
  },
})

const productWithMetadata = (metadata: unknown): HttpTypes.StoreProduct =>
  ({ ...product, metadata }) as unknown as HttpTypes.StoreProduct

const dependencies = (
  retrieveProduct: ProductRouteSourceDependencies["retrieveProduct"]
): ProductRouteSourceDependencies => ({
  resolveMarket: vi.fn(() => binding),
  retrievePublicationSource: vi.fn().mockResolvedValue({
    entityId: "prod_1",
    marketCode: "sk",
    publicSlug: "vitamin-c",
    salesChannelId: "sc_sk",
    sourceVersion: "2026-08-19T00:00:00.000Z",
    translation: {
      localeCode: "sk-SK",
      reference: "product",
      translationId: "trans_1",
    },
  }),
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
        retrievePublicationSource: vi.fn(),
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

  it.each([
    null,
    undefined,
    {},
    { url_registry_publication: null },
    publicationMetadata(assignment(), { markets: {} }),
  ])("returns missing when publication metadata has no SK assignment: %o", async (metadata) => {
    const result = await readProductRouteSource(
      request,
      dependencies(
        vi.fn().mockResolvedValue({ product: productWithMetadata(metadata) })
      )
    )

    expect(result).toEqual({ kind: "missing" })
  })

  it.each([
    assignment({ publicationStatus: "draft" }),
    assignment({ publicSlug: "different-slug" }),
    assignment({ salesChannelId: "sc_other" }),
  ])("returns missing when the requested market assignment is not publishable: %o", async (marketAssignment) => {
    const result = await readProductRouteSource(
      request,
      dependencies(
        vi.fn().mockResolvedValue({
          product: productWithMetadata(publicationMetadata(marketAssignment)),
        })
      )
    )

    expect(result).toEqual({ kind: "missing" })
  })

  it.each([
    [],
    { url_registry_publication: [] },
    publicationMetadata(assignment(), { schemaVersion: 2 }),
    publicationMetadata(assignment(), { unexpected: true }),
    {
      url_registry_publication: { schemaVersion: 1, markets: [] },
    },
    {
      url_registry_publication: {
        schemaVersion: 1,
        markets: { de: assignment() },
      },
    },
    publicationMetadata(null),
    publicationMetadata({
      publicationStatus: "published",
      publicSlug: "vitamin-c",
    }),
    publicationMetadata(assignment({ unexpected: true })),
    publicationMetadata(assignment({ publicationStatus: "scheduled" })),
    publicationMetadata(assignment({ publicSlug: "Vitamin C" })),
    publicationMetadata(assignment({ salesChannelId: "sc sk" })),
  ])("maps malformed publication metadata %o to invalid-response", async (metadata) => {
    const result = await readProductRouteSource(
      request,
      dependencies(
        vi.fn().mockResolvedValue({ product: productWithMetadata(metadata) })
      )
    )

    expect(result).toEqual({
      kind: "invalid-response",
      causeCode: "INVALID_PRODUCT_PUBLICATION_METADATA",
    })
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
      retrievePublicationSource: vi.fn(),
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
      retrievePublicationSource: vi.fn(),
      retrieveProduct: vi.fn(),
    })

    expect(result).toEqual({ kind: "unavailable" })
  })

  it("requires an exact-locale Translation proof from Medusa", async () => {
    const deps = {
      ...dependencies(vi.fn().mockResolvedValue({ product })),
      retrievePublicationSource: vi.fn().mockResolvedValue({
        entityId: "prod_1",
        marketCode: "sk",
        publicSlug: "vitamin-c",
        salesChannelId: "sc_sk",
        sourceVersion: "2026-08-19T00:00:00.000Z",
        translation: {
          localeCode: "cs-CZ",
          reference: "product",
          translationId: "trans_1",
        },
      }),
    }

    await expect(readProductRouteSource(request, deps)).resolves.toEqual({
      causeCode: "INVALID_PRODUCT_TRANSLATION_PROOF",
      kind: "invalid-response",
    })
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
      {
        ...dependencies(vi.fn().mockResolvedValue({ product })),
        retrievePublicationSource: vi.fn().mockResolvedValue({
          entityId: "prod_expected",
          marketCode: "sk",
          publicSlug: "vitamin-c",
          salesChannelId: "sc_sk",
          sourceVersion: "2026-08-19T00:00:00.000Z",
          translation: {
            localeCode: "sk-SK",
            reference: "product",
            translationId: "trans_1",
          },
        }),
      }
    )

    expect(result).toEqual({
      kind: "invalid-response",
      causeCode: "INVALID_MEDUSA_PRODUCT_RESPONSE",
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

  it("requires product identity and the exact market, slug, source version, and locale proof", async () => {
    await expect(
      readProductAlternateSource(
        alternateRequest,
        dependencies(vi.fn().mockResolvedValue({ product: { id: "prod_1" } }))
      )
    ).resolves.toEqual({ kind: "found", value: { id: "prod_1" } })
  })

  it.each([
    [
      "source version drift",
      { sourceVersion: "2026-08-20T00:00:00.000Z" },
      "PRODUCT_PUBLICATION_SOURCE_VERSION_MISMATCH",
    ],
    [
      "wrong locale",
      {
        translation: {
          localeCode: "cs-CZ",
          reference: "product",
          translationId: "trans_1",
        },
      },
      "INVALID_PRODUCT_TRANSLATION_PROOF",
    ],
    ["wrong market", { marketCode: "cz" }, "INVALID_PRODUCT_TRANSLATION_PROOF"],
  ])("rejects %s before publishing an alternate", async (_label, override, causeCode) => {
    const deps = {
      ...dependencies(vi.fn().mockResolvedValue({ product: { id: "prod_1" } })),
      retrievePublicationSource: vi.fn().mockResolvedValue({
        entityId: "prod_1",
        marketCode: "sk",
        publicSlug: "vitamin-c",
        salesChannelId: "sc_sk",
        sourceVersion: "2026-08-19T00:00:00.000Z",
        translation: {
          localeCode: "sk-SK",
          reference: "product",
          translationId: "trans_1",
        },
        ...override,
      }),
    }

    await expect(
      readProductAlternateSource(alternateRequest, deps)
    ).resolves.toEqual({ causeCode, kind: "invalid-response" })
  })
})
