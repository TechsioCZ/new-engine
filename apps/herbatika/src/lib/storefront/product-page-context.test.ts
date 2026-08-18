import { describe, expect, it, vi } from "vitest"
import {
  type ProductPageContextDependencies,
  readProductPageContext,
} from "./product-page-context"
import type {
  ProductRouteMedusaProduct,
  ProductRouteSourceMarketBinding,
} from "./product-route-source"

const marketDetails = {
  sk: { countryCode: "SK", currencyCode: "EUR", locale: "sk-SK" },
  cz: { countryCode: "CZ", currencyCode: "CZK", locale: "cs-CZ" },
  hu: { countryCode: "HU", currencyCode: "HUF", locale: "hu-HU" },
  ro: { countryCode: "RO", currencyCode: "RON", locale: "ro-RO" },
} as const

const createProduct = (
  currencyCode: string,
  variants: readonly Record<string, unknown>[] = [
    {
      calculated_price: {
        calculated_amount: 10,
        currency_code: currencyCode,
      },
      id: "variant-default",
      sku: "SKU-DEFAULT",
    },
  ]
) =>
  ({
    handle: "backend-handle",
    id: "prod-1",
    title: "Product",
    variants,
  }) as unknown as ProductRouteMedusaProduct

const createDependencies = (
  market: keyof typeof marketDetails,
  overrides: Partial<ProductPageContextDependencies> = {}
): ProductPageContextDependencies => {
  const details = marketDetails[market]
  return {
    loadMessages: vi.fn().mockResolvedValue({
      "catalog.product_detail.retry": "Retry",
      "navigation.breadcrumbs.home": "Home",
    }),
    resolveMarket: vi.fn(() => ({
      countryCode: details.countryCode,
      locale: details.locale,
      market,
      publishableApiKey: `pk_${market}`,
      regionId: `reg_${market}`,
      salesChannelId: `sc_${market}`,
    })),
    ...overrides,
  }
}

describe("readProductPageContext", () => {
  it.each(
    Object.entries(marketDetails)
  )("builds the trusted %s provider context without a market fallback", async (market, details) => {
    const typedMarket = market as keyof typeof marketDetails
    const dependencies = createDependencies(typedMarket)
    const result = await readProductPageContext(
      {
        market: typedMarket,
        product: createProduct(details.currencyCode.toLowerCase()),
      },
      dependencies
    )

    expect(result).toEqual({
      kind: "found",
      value: {
        locale: details.locale,
        marketContext: expect.objectContaining({ code: typedMarket }),
        messages: {
          catalog: { product_detail: { retry: "Retry" } },
          navigation: { breadcrumbs: { home: "Home" } },
        },
        region: {
          country_code: details.countryCode.toLowerCase(),
          currency_code: details.currencyCode,
          region_id: `reg_${market}`,
          salesChannelId: `sc_${market}`,
        },
      },
    })
    expect(dependencies.loadMessages).toHaveBeenCalledWith(
      expect.objectContaining({
        binding: expect.objectContaining({ market: typedMarket }),
        locale: details.locale,
        market: typedMarket,
      })
    )
  })

  it("derives currency from the explicitly selected non-first variant", async () => {
    const result = await readProductPageContext(
      {
        initialVariantId: "variant-selected",
        market: "cz",
        product: createProduct("eur", [
          {
            calculated_price: {
              calculated_amount: 10,
              currency_code: "eur",
            },
            id: "variant-default",
          },
          {
            calculated_price: {
              calculated_amount: 250,
              currency_code: "czk",
            },
            id: "variant-selected",
          },
        ]),
      },
      createDependencies("cz")
    )

    expect(result).toMatchObject({
      kind: "found",
      value: { region: { currency_code: "CZK" } },
    })
  })

  it.each<readonly [string, ProductRouteSourceMarketBinding | null]>([
    ["missing binding", null],
    [
      "cross-market binding",
      {
        countryCode: "SK",
        locale: "sk-SK",
        market: "sk",
        publishableApiKey: "pk_sk",
        regionId: "reg_sk",
        salesChannelId: "sc_sk",
      },
    ],
  ])("rejects a %s", async (_label, binding) => {
    const result = await readProductPageContext(
      { market: "cz", product: createProduct("czk") },
      createDependencies("cz", { resolveMarket: vi.fn(() => binding) })
    )

    expect(result).toEqual({
      causeCode: "INVALID_PRODUCT_PAGE_MARKET_BINDING",
      kind: "invalid-response",
    })
  })

  it("rejects a product without authoritative market currency", async () => {
    const result = await readProductPageContext(
      { market: "sk", product: createProduct("") },
      createDependencies("sk")
    )

    expect(result).toEqual({
      causeCode: "INVALID_PRODUCT_PAGE_CURRENCY",
      kind: "invalid-response",
    })
  })

  it("rejects a product priced for a different market", async () => {
    const result = await readProductPageContext(
      { market: "cz", product: createProduct("eur") },
      createDependencies("cz")
    )

    expect(result).toEqual({
      causeCode: "INVALID_PRODUCT_PAGE_CURRENCY",
      kind: "invalid-response",
    })
  })

  it("maps translation transport failures to unavailable", async () => {
    const result = await readProductPageContext(
      { market: "sk", product: createProduct("eur") },
      createDependencies("sk", {
        loadMessages: vi.fn().mockRejectedValue(new TypeError("fetch failed")),
      })
    )

    expect(result).toEqual({ kind: "unavailable" })
  })

  it("maps conflicting translation keys to an invalid response", async () => {
    const result = await readProductPageContext(
      { market: "sk", product: createProduct("eur") },
      createDependencies("sk", {
        loadMessages: vi.fn().mockResolvedValue({
          catalog: "Catalog",
          "catalog.product": "Product",
        }),
      })
    )

    expect(result).toEqual({
      causeCode: "INVALID_PRODUCT_PAGE_MESSAGES",
      kind: "invalid-response",
    })
  })
})
