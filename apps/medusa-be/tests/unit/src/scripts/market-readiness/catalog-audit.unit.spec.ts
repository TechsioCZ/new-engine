import { describe, expect, it } from "vitest"
import {
  buildFourMarketCatalogAuditReport,
  type FourMarketCatalogAuditInput,
  hashFourMarketCatalogAuditReport,
  serializeFourMarketCatalogAuditReport,
} from "../../../../../src/scripts/market-readiness/catalog-audit"

const generatedAt = "2026-08-21T00:00:00.000Z"
const SHA256_PATTERN = /^[a-f0-9]{64}$/

const inputFixture = (): FourMarketCatalogAuditInput => {
  const bindings = [
    {
      countryCode: "sk",
      currencyCode: "eur",
      localeCode: "sk-SK",
      market: "sk",
      regionId: "reg_sk",
      salesChannelId: "sc_sk",
    },
    {
      countryCode: "cz",
      currencyCode: "czk",
      localeCode: "cs-CZ",
      market: "cz",
      regionId: "reg_cz",
      salesChannelId: "sc_cz",
    },
    {
      countryCode: "hu",
      currencyCode: "huf",
      localeCode: "hu-HU",
      market: "hu",
      regionId: "reg_hu",
      salesChannelId: "sc_hu",
    },
    {
      countryCode: "ro",
      currencyCode: "ron",
      localeCode: "ro-RO",
      market: "ro",
      regionId: "reg_ro",
      salesChannelId: "sc_ro",
    },
  ] as const

  return {
    assignments: bindings.map((binding) => ({
      entityId: "prod_shared",
      entityKind: "product",
      market: binding.market,
      publicSlug: `shared-${binding.market}`,
      publicationStatus: "published",
      salesChannelId: binding.salesChannelId,
    })),
    expectedMarkets: bindings.map((binding) => ({
      ...binding,
      publications: [
        {
          entityId: "prod_shared",
          entityKind: "product",
          publicSlug: `shared-${binding.market}`,
          translations: [
            {
              reference: "product",
              referenceId: "prod_shared",
              requiredFields: ["title"],
            },
          ],
        },
      ],
      publishedProductIds: ["prod_shared"],
    })),
    expectedSharedCatalog: [
      {
        productId: "prod_shared",
        status: "published",
        variants: [
          {
            ean: "8580000000001",
            inventoryItemIds: ["iitem_shared"],
            sku: "SHARED-1",
            variantId: "variant_shared",
          },
        ],
      },
    ],
    locales: bindings.map(({ localeCode }, index) => ({
      code: localeCode,
      id: `locale_${index}`,
    })),
    products: [
      {
        productId: "prod_shared",
        salesChannelIds: bindings.map(({ salesChannelId }) => salesChannelId),
        status: "published",
        variants: [
          {
            ean: "8580000000001",
            inventoryItemIds: ["iitem_shared"],
            sku: "SHARED-1",
            variantId: "variant_shared",
          },
        ],
      },
    ],
    regions: bindings.map((binding) => ({
      countryCodes: [binding.countryCode],
      currencyCode: binding.currencyCode,
      id: binding.regionId,
    })),
    salesChannels: bindings.map(({ salesChannelId }) => ({
      id: salesChannelId,
    })),
    translations: bindings.map((binding) => ({
      id: `translation_${binding.market}`,
      localeCode: binding.localeCode,
      reference: "product",
      referenceId: "prod_shared",
      translations: { title: `Localized ${binding.market}` },
    })),
  }
}

describe("four-market catalog audit", () => {
  it("proves exact bindings, publication and shared identity for all four markets", () => {
    const report = buildFourMarketCatalogAuditReport(
      inputFixture(),
      generatedAt
    )

    expect(report.ready).toBe(true)
    expect(report.kind).toBe("herbatika-four-market-catalog-readiness")
    expect(report.scope).toBe("four-market-catalog-readiness")
    expect(report.schemaVersion).toBe(1)
    expect(report.markets.map(({ market }) => market)).toEqual([
      "sk",
      "cz",
      "hu",
      "ro",
    ])
    expect(report.summary).toEqual({
      errors: 0,
      inventoryItems: 1,
      products: 1,
      publications: 4,
      translationContracts: 4,
      variants: 1,
    })
    expect(report.sharedIdentity).toMatchObject({
      inventoryItems: 1,
      matched: true,
      products: 1,
      variants: 1,
    })
    expect(report.sharedIdentity.expectedDataHash).toMatch(SHA256_PATTERN)
    expect(report.sharedIdentity.observedDataHash).toBe(
      report.sharedIdentity.expectedDataHash
    )

    const bytes = serializeFourMarketCatalogAuditReport(report)
    expect(bytes.endsWith("\n")).toBe(true)
    expect(bytes).not.toContain("\n\n")
    expect(hashFourMarketCatalogAuditReport(report)).toMatch(SHA256_PATTERN)
  })

  it("fails closed when a market scope is missing or uses the wrong locale", () => {
    const input = inputFixture()
    const missingMarket = buildFourMarketCatalogAuditReport(
      {
        ...input,
        expectedMarkets: input.expectedMarkets.filter(
          ({ market }) => market !== "ro"
        ),
      },
      generatedAt
    )
    const wrongLocale = buildFourMarketCatalogAuditReport(
      {
        ...input,
        expectedMarkets: input.expectedMarkets.map((market) =>
          market.market === "cz" ? { ...market, localeCode: "sk-SK" } : market
        ),
      },
      generatedAt
    )

    expect(missingMarket.ready).toBe(false)
    expect(missingMarket.issues.map(({ code }) => code)).toContain(
      "EXPECTED_MARKET_SCOPE_MISSING"
    )
    expect(wrongLocale.ready).toBe(false)
    expect(wrongLocale.issues.map(({ code }) => code)).toContain(
      "MARKET_BINDING_MISMATCH"
    )
  })

  it("rejects missing locale, region/currency and sales-channel bindings", () => {
    const input = inputFixture()
    const report = buildFourMarketCatalogAuditReport(
      {
        ...input,
        locales: input.locales.filter(({ code }) => code !== "cs-CZ"),
        regions: input.regions.map((region) =>
          region.id === "reg_hu" ? { ...region, currencyCode: "eur" } : region
        ),
        salesChannels: input.salesChannels.filter(({ id }) => id !== "sc_ro"),
      },
      generatedAt
    )

    expect(report.ready).toBe(false)
    expect(report.sharedIdentity.matched).toBe(true)
    expect(report.issues.map(({ code }) => code)).toEqual(
      expect.arrayContaining([
        "EXACT_LOCALE_BINDING_INVALID",
        "EXACT_REGION_BINDING_INVALID",
        "EXACT_SALES_CHANNEL_BINDING_INVALID",
      ])
    )
  })

  it("rejects publication, translation and product-channel drift", () => {
    const input = inputFixture()
    const report = buildFourMarketCatalogAuditReport(
      {
        ...input,
        assignments: [
          ...input.assignments.map((assignment) =>
            assignment.market === "hu"
              ? { ...assignment, publicSlug: "wrong-hu-slug" }
              : assignment
          ),
          {
            entityId: "category_extra",
            entityKind: "category",
            market: "sk",
            publicSlug: "extra",
            publicationStatus: "published",
            salesChannelId: "sc_sk",
          },
        ],
        products: input.products.map((product) => ({
          ...product,
          salesChannelIds: product.salesChannelIds.filter(
            (salesChannelId) => salesChannelId !== "sc_ro"
          ),
        })),
        translations: input.translations.map((translation) =>
          translation.localeCode === "cs-CZ"
            ? { ...translation, translations: { title: "   " } }
            : translation
        ),
      },
      generatedAt
    )

    expect(report.ready).toBe(false)
    expect(report.sharedIdentity.matched).toBe(true)
    expect(report.issues.map(({ code }) => code)).toEqual(
      expect.arrayContaining([
        "PRODUCT_SALES_CHANNEL_PUBLICATION_MISSING",
        "PUBLICATION_ASSIGNMENT_MISMATCH",
        "TRANSLATION_CONTRACT_INVALID",
        "UNEXPECTED_PUBLISHED_ASSIGNMENT",
      ])
    )
  })

  it("rejects cloned products and altered variant inventory identity", () => {
    const input = inputFixture()
    const sourceProduct = input.products[0]
    if (!sourceProduct) {
      throw new Error("Fixture product is required")
    }
    const report = buildFourMarketCatalogAuditReport(
      {
        ...input,
        products: [
          {
            ...sourceProduct,
            variants: sourceProduct.variants.map((variant) => ({
              ...variant,
              inventoryItemIds: ["iitem_changed"],
            })),
          },
          {
            ...sourceProduct,
            productId: "prod_market_clone",
            variants: sourceProduct.variants.map((variant) => ({
              ...variant,
              variantId: "variant_market_clone",
            })),
          },
        ],
      },
      generatedAt
    )

    expect(report.ready).toBe(false)
    expect(report.sharedIdentity.matched).toBe(false)
    expect(report.issues.map(({ code }) => code)).toEqual(
      expect.arrayContaining([
        "DUPLICATE_VARIANT_STABLE_IDENTITY",
        "SHARED_PRODUCT_IDENTITY_MISMATCH",
        "SHARED_PRODUCT_SCOPE_MISMATCH",
      ])
    )
  })

  it("rejects a market publication whose shared product is not globally published", () => {
    const input = inputFixture()
    const report = buildFourMarketCatalogAuditReport(
      {
        ...input,
        expectedSharedCatalog: input.expectedSharedCatalog.map((product) => ({
          ...product,
          status: "draft",
        })),
        products: input.products.map((product) => ({
          ...product,
          status: "draft",
        })),
      },
      generatedAt
    )

    expect(report.ready).toBe(false)
    expect(report.sharedIdentity.matched).toBe(true)
    expect(report.issues.map(({ code }) => code)).toContain(
      "PUBLISHED_PRODUCT_STATUS_INVALID"
    )
  })
})
