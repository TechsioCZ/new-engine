import { describe, expect, it } from "vitest"
import {
  buildFourMarketCommerceReadiness,
  buildMarketCommerceReadinessProof,
  computeSharedCatalogSha256,
  computeSharedInventorySha256,
  hashMarketCommerceReadinessProof,
  parseFourMarketCommerceReadinessProof,
  parseMarketCommerceReadinessProof,
  serializeMarketCommerceReadinessProof,
} from "../../../../src/scripts/market-commerce-readiness"
import type {
  FourMarketCommerceReadinessInput,
  MarketCommerceReadinessInput,
} from "../../../../src/scripts/market-commerce-readiness/types"

const SHA_A = "a".repeat(64)
const SHA_B = "b".repeat(64)
const SHA_256 = /^[a-f0-9]{64}$/
const RELEASE_IDENTITY = {
  backendBuildHash: "build-1",
  backendDeploymentId: "deployment-1",
  backendReleaseSha: "abcdef1234567890",
  backendSlot: "blue" as const,
  databaseInstanceFingerprint: SHA_A,
  environmentId: "production",
  releaseId: "release-1",
}

const MARKET_CONTRACTS = {
  cz: { countryCode: "cz", currencyCode: "czk", locale: "cs-CZ" },
  hu: { countryCode: "hu", currencyCode: "huf", locale: "hu-HU" },
  ro: { countryCode: "ro", currencyCode: "ron", locale: "ro-RO" },
  sk: { countryCode: "sk", currencyCode: "eur", locale: "sk-SK" },
} as const

const marketInput = (
  market: keyof typeof MARKET_CONTRACTS
): MarketCommerceReadinessInput => {
  const contract = MARKET_CONTRACTS[market]
  const regionId = `reg_${market}`
  const salesChannelId = `sc_${market}`
  const variantId = "variant_shared"
  const amount = {
    cz: "1299",
    hu: "4999",
    ro: "52.52",
    sk: "12.99",
  }[market]

  return {
    approvedVariantPrices: [
      {
        amount,
        authoritySha256: SHA_A,
        currencyCode: contract.currencyCode,
        variantId,
      },
    ],
    checkoutCanary: {
      artifactKind: "checkout-readiness-canary",
      checkedAt: "2026-08-21T09:55:00.000Z",
      countryCode: contract.countryCode,
      currencyCode: contract.currencyCode,
      mutationPolicy: "no-order-no-payment-mutation",
      orderId: null,
      paymentCollectionId: null,
      paymentSessionId: null,
      releaseIdentity: RELEASE_IDENTITY,
      regionId,
      salesChannelId,
      schemaVersion: 2,
      shippingAvailable: true,
      taxAvailable: true,
      enabledPaymentAvailable: true,
      variantId,
    },
    locale: contract.locale,
    market,
    observedVariantPrices: [
      { amount, currencyCode: contract.currencyCode, variantId },
    ],
    paymentProviders: [
      { enabled: true, id: `pp_${market}`, regionIds: [regionId] },
    ],
    publishedVariantIds: [variantId],
    region: {
      countryCodes: [contract.countryCode],
      currencyCode: contract.currencyCode,
      id: regionId,
    },
    salesChannelId,
    shippingOptions: [
      {
        countryCodes: [contract.countryCode],
        currencyCode: contract.currencyCode,
        enabled: true,
        id: `ship_${market}`,
        regionId,
      },
    ],
    tax: {
      countryCode: contract.countryCode,
      id: `taxreg_${market}`,
      rates: [{ enabled: true, id: `tax_${market}`, rate: 20 }],
    },
    unavailableVariants: [],
  }
}

const input = (): FourMarketCommerceReadinessInput => ({
  capturedAt: "2026-08-21T10:00:00.000Z",
  markets: [
    marketInput("sk"),
    marketInput("cz"),
    marketInput("hu"),
    marketInput("ro"),
  ],
  sharedCatalog: {
    productIds: ["prod_shared"],
    reviewedSha256: SHA_A,
    variants: [
      {
        ean: "8580000000001",
        id: "variant_shared",
        productId: "prod_shared",
        sku: "shared-1",
      },
    ],
  },
  sharedInventory: {
    links: [
      {
        inventoryItemId: "iitem_shared",
        requiredQuantity: 1,
        variantId: "variant_shared",
      },
    ],
    levels: [
      {
        incomingQuantity: 0,
        inventoryItemId: "iitem_shared",
        locationId: "sloc_shared",
        reservedQuantity: 2,
        stockedQuantity: 10,
      },
    ],
    reviewedSha256: SHA_B,
  },
})

describe("four-market commerce readiness", () => {
  it("builds exact SK/CZ/HU/RO proofs over shared identities and inventory", () => {
    const initial = input()
    const value: FourMarketCommerceReadinessInput = {
      ...initial,
      sharedCatalog: {
        ...initial.sharedCatalog,
        reviewedSha256: computeSharedCatalogSha256(initial.sharedCatalog),
      },
      sharedInventory: {
        ...initial.sharedInventory,
        reviewedSha256: computeSharedInventorySha256(initial.sharedInventory),
      },
    }

    const proof = buildFourMarketCommerceReadiness(value)

    expect(proof.ready).toBe(true)
    expect(
      proof.markets.map(({ market, currencyCode }) => [market, currencyCode])
    ).toEqual([
      ["sk", "eur"],
      ["cz", "czk"],
      ["hu", "huf"],
      ["ro", "ron"],
    ])
    expect(proof.markets.every((market) => market.ready)).toBe(true)
    expect(proof.sharedCatalog.preserved).toBe(true)
    expect(proof.sharedInventory.preserved).toBe(true)

    const serialized = serializeMarketCommerceReadinessProof(proof)
    expect(serialized.endsWith("\n")).toBe(true)
    expect(serialized.endsWith("\n\n")).toBe(false)
    expect(hashMarketCommerceReadinessProof(proof)).toMatch(SHA_256)
  })

  it("proves the Romanian 2,031 published variants as 2,002 sellable and 29 unavailable", () => {
    const base = marketInput("ro")
    const publishedVariantIds = Array.from(
      { length: 2031 },
      (_, index) => `variant_ro_${String(index).padStart(4, "0")}`
    )
    const sellableVariantIds = publishedVariantIds.slice(0, 2002)
    const unavailableVariants = publishedVariantIds
      .slice(2002)
      .map((variantId) => ({ reason: "not_offered_in_market", variantId }))
    const sharedCatalog = {
      productIds: ["prod_ro"],
      reviewedSha256: SHA_A,
      variants: publishedVariantIds.map((variantId) => ({
        ean: null,
        id: variantId,
        productId: "prod_ro",
        sku: variantId,
      })),
    }
    const sharedInventory = {
      levels: [],
      links: [],
      reviewedSha256: SHA_B,
    }
    const market: MarketCommerceReadinessInput = {
      ...base,
      approvedVariantPrices: sellableVariantIds.map((variantId) => ({
        amount: "52.52",
        authoritySha256: SHA_A,
        currencyCode: "ron",
        variantId,
      })),
      checkoutCanary: {
        ...base.checkoutCanary,
        variantId: sellableVariantIds[0] ?? "",
      },
      observedVariantPrices: sellableVariantIds.map((variantId) => ({
        amount: "52.52",
        currencyCode: "ron",
        variantId,
      })),
      publishedVariantIds,
      unavailableVariants,
    }

    const proof = buildMarketCommerceReadinessProof(market, {
      capturedAt: "2026-08-21T10:00:00.000Z",
      sharedCatalog: {
        ...sharedCatalog,
        reviewedSha256: computeSharedCatalogSha256(sharedCatalog),
      },
      sharedInventory: {
        ...sharedInventory,
        reviewedSha256: computeSharedInventorySha256(sharedInventory),
      },
    })

    expect(proof.ready).toBe(true)
    expect(proof.publishedVariantCount).toBe(2031)
    expect(proof.sellableVariantCount).toBe(2002)
    expect(proof.unavailableVariantCount).toBe(29)
    expect(proof.sellableVariantIds).toEqual(sellableVariantIds)
    expect(proof.unavailableVariants).toEqual(unavailableVariants)
    expect(
      parseMarketCommerceReadinessProof(
        serializeMarketCommerceReadinessProof(proof)
      )
    ).toEqual(proof)
  })

  it("rejects overlap or a positive observed price in the unavailable partition", () => {
    const valid = validInput()
    const overlap = mutateMarket(valid, "ro", (market) => ({
      ...market,
      unavailableVariants: [
        { reason: "not_offered_in_market", variantId: "variant_shared" },
      ],
    }))
    const overlapProof = buildFourMarketCommerceReadiness(overlap)

    expect(overlapProof.issues).toContain(
      "ro:variant_availability_partition_invalid"
    )
    expect(overlapProof.issues).toContain(
      "ro:unavailable_variant_has_sellable_price:variant_shared"
    )
  })

  it.each([
    {
      expectedIssue: "cz:region_currency_mismatch",
      mutate: (value: FourMarketCommerceReadinessInput) => ({
        ...value,
        markets: value.markets.map((market) =>
          market.market === "cz"
            ? {
                ...market,
                region: { ...market.region, currencyCode: "eur" },
              }
            : market
        ),
      }),
    },
    {
      expectedIssue: "hu:variant_price_scope_mismatch",
      mutate: (value: FourMarketCommerceReadinessInput) => ({
        ...value,
        markets: value.markets.map((market) =>
          market.market === "hu"
            ? { ...market, approvedVariantPrices: [] }
            : market
        ),
      }),
    },
    {
      expectedIssue: "ro:checkout_canary_invalid",
      mutate: (value: FourMarketCommerceReadinessInput) => ({
        ...value,
        markets: value.markets.map((market) =>
          market.market === "ro"
            ? {
                ...market,
                checkoutCanary: {
                  ...market.checkoutCanary,
                  orderId: "order_forbidden",
                } as unknown as MarketCommerceReadinessInput["checkoutCanary"],
              }
            : market
        ),
      }),
    },
    {
      expectedIssue: "sk:sales_channel_missing",
      mutate: (value: FourMarketCommerceReadinessInput) =>
        mutateMarket(value, "sk", (market) => ({
          ...market,
          salesChannelId: "",
        })),
    },
    {
      expectedIssue: "cz:shipping_unavailable",
      mutate: (value: FourMarketCommerceReadinessInput) =>
        mutateMarket(value, "cz", (market) => ({
          ...market,
          shippingOptions: [],
        })),
    },
    {
      expectedIssue: "hu:tax_unavailable",
      mutate: (value: FourMarketCommerceReadinessInput) =>
        mutateMarket(value, "hu", (market) => ({
          ...market,
          tax: { ...market.tax, rates: [] },
        })),
    },
    {
      expectedIssue: "ro:enabled_payment_unavailable",
      mutate: (value: FourMarketCommerceReadinessInput) =>
        mutateMarket(value, "ro", (market) => ({
          ...market,
          paymentProviders: market.paymentProviders.map((provider) => ({
            ...provider,
            enabled: false,
          })),
        })),
    },
    {
      expectedIssue: "sk:region_country_scope_mismatch",
      mutate: (value: FourMarketCommerceReadinessInput) =>
        mutateMarket(value, "sk", (market) => ({
          ...market,
          region: { ...market.region, countryCodes: ["sk", "cz"] },
        })),
    },
    {
      expectedIssue: "cz:variant_price_not_approved:variant_shared",
      mutate: (value: FourMarketCommerceReadinessInput) =>
        mutateMarket(value, "cz", (market) => ({
          ...market,
          observedVariantPrices: market.observedVariantPrices.map((price) => ({
            ...price,
            amount: "1300",
          })),
        })),
    },
    {
      expectedIssue: "hu:published_variant_not_shared",
      mutate: (value: FourMarketCommerceReadinessInput) =>
        mutateMarket(value, "hu", (market) => ({
          ...market,
          approvedVariantPrices: market.approvedVariantPrices.map((price) => ({
            ...price,
            variantId: "variant_market_clone",
          })),
          checkoutCanary: {
            ...market.checkoutCanary,
            variantId: "variant_market_clone",
          },
          observedVariantPrices: market.observedVariantPrices.map((price) => ({
            ...price,
            variantId: "variant_market_clone",
          })),
          publishedVariantIds: ["variant_market_clone"],
        })),
    },
  ])("fails closed on $expectedIssue", ({ expectedIssue, mutate }) => {
    const valid = validInput()
    const proof = buildFourMarketCommerceReadiness(mutate(valid))

    expect(proof.ready).toBe(false)
    expect(proof.issues).toContain(expectedIssue)
  })

  it("fails every market when the reviewed shared inventory no longer matches", () => {
    const valid = validInput()
    const proof = buildFourMarketCommerceReadiness({
      ...valid,
      sharedInventory: {
        ...valid.sharedInventory,
        levels: valid.sharedInventory.levels.map((level) => ({
          ...level,
          stockedQuantity: level.stockedQuantity + 1,
        })),
      },
    })

    expect(proof.ready).toBe(false)
    expect(proof.sharedInventory.preserved).toBe(false)
    expect(proof.markets.every((market) => !market.ready)).toBe(true)
  })

  it("hash-binds the variant to inventory-item required quantity", () => {
    const valid = validInput()
    const changed = {
      ...valid.sharedInventory,
      links: valid.sharedInventory.links.map((link) => ({
        ...link,
        requiredQuantity: link.requiredQuantity + 1,
      })),
    }

    expect(computeSharedInventorySha256(changed)).not.toBe(
      valid.sharedInventory.reviewedSha256
    )
  })

  it("round-trips only exact canonical JSON plus one LF", () => {
    const proof = buildFourMarketCommerceReadiness(validInput())
    const serialized = serializeMarketCommerceReadinessProof(proof)

    expect(parseFourMarketCommerceReadinessProof(serialized)).toEqual(proof)
    expect(() =>
      parseFourMarketCommerceReadinessProof(serialized.trim())
    ).toThrow("canonical JSON plus one LF")
    expect(() =>
      parseFourMarketCommerceReadinessProof(
        `${JSON.stringify({ ...proof, unexpected: true })}\n`
      )
    ).toThrow("unexpected field")
    expect(() =>
      parseFourMarketCommerceReadinessProof(
        serializeMarketCommerceReadinessProof({
          ...proof,
          ready: false,
        })
      )
    ).toThrow("ready contradicts")
  })

  it("emits an independently hashable per-market proof", () => {
    const valid = validInput()
    const market = valid.markets.find((candidate) => candidate.market === "cz")
    if (!market) {
      throw new Error("CZ fixture is missing")
    }

    const proof = buildMarketCommerceReadinessProof(market, {
      capturedAt: valid.capturedAt,
      sharedCatalog: valid.sharedCatalog,
      sharedInventory: valid.sharedInventory,
    })
    const bytes = serializeMarketCommerceReadinessProof(proof)

    expect(proof.ready).toBe(true)
    expect(parseMarketCommerceReadinessProof(bytes)).toEqual(proof)
    expect(hashMarketCommerceReadinessProof(proof)).toMatch(SHA_256)

    expect(() =>
      parseMarketCommerceReadinessProof(
        serializeMarketCommerceReadinessProof({
          ...proof,
          unavailableVariantCount: proof.unavailableVariantCount + 1,
        })
      )
    ).toThrow("variant partition contradicts its evidence")

    expect(() =>
      parseMarketCommerceReadinessProof(
        serializeMarketCommerceReadinessProof({
          ...proof,
          sharedInventory: {
            ...proof.sharedInventory,
            observedSha256: SHA_B,
            preserved: false,
          },
        })
      )
    ).toThrow("lacks required commerce evidence")
  })
})

const validInput = (): FourMarketCommerceReadinessInput => {
  const initial = input()
  return {
    ...initial,
    sharedCatalog: {
      ...initial.sharedCatalog,
      reviewedSha256: computeSharedCatalogSha256(initial.sharedCatalog),
    },
    sharedInventory: {
      ...initial.sharedInventory,
      reviewedSha256: computeSharedInventorySha256(initial.sharedInventory),
    },
  }
}

const mutateMarket = (
  value: FourMarketCommerceReadinessInput,
  marketCode: MarketCommerceReadinessInput["market"],
  mutate: (market: MarketCommerceReadinessInput) => MarketCommerceReadinessInput
): FourMarketCommerceReadinessInput => ({
  ...value,
  markets: value.markets.map((market) =>
    market.market === marketCode ? mutate(market) : market
  ),
})
