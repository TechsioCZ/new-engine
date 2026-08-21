import { describe, expect, it, vi } from "vitest"
import { buildTestPriceConversionPlan } from "../../../../../src/scripts/market-price-authority/test-conversion"
import {
  assertTestPriceConversionApplied,
  buildTestPriceConversionDatabaseInstanceFingerprint,
  buildTestPriceConversionPriceAdds,
  parseTestPriceConversionCliOptions,
} from "../../../../../src/scripts/market-price-authority/test-conversion-runtime"
import type { MarketPriceDatabaseSnapshot } from "../../../../../src/scripts/market-price-authority/types"
import { price } from "./fixtures"

const binding = {
  backendReleaseSha: "6827bfd450a163e7dd350a396ca1f9363e06235e",
  databaseInstanceFingerprint: "a".repeat(64),
  environmentId: "test-engine" as const,
  inventoryFingerprintSha256: "b".repeat(64),
}

const databaseSnapshot = (): MarketPriceDatabaseSnapshot => ({
  products: [
    {
      id: "prod_shared",
      salesChannelIds: ["sc_shared"],
      status: "published",
      variants: [
        {
          id: "variant_shared",
          priceSetId: "pset_shared",
          prices: [
            price("price_eur", "eur", 10),
            { ...price("price_eur_list", "eur", 8), priceListId: "plist" },
          ],
        },
      ],
    },
  ],
})

describe("test-only price conversion runtime", () => {
  it("groups only planned creates into one pricing-module add per price set", () => {
    const plan = buildTestPriceConversionPlan(databaseSnapshot(), binding)
    expect(buildTestPriceConversionPriceAdds(plan)).toEqual([
      {
        priceSetId: "pset_shared",
        prices: [
          { amount: 242, currency_code: "czk", rules: {} },
          { amount: 3651, currency_code: "huf", rules: {} },
          { amount: 52.52, currency_code: "ron", rules: {} },
        ],
      },
    ])
  })

  it("proves the exact price-only delta while preserving EUR and catalog identity", () => {
    const initial = databaseSnapshot()
    const plan = buildTestPriceConversionPlan(initial, binding)
    const after: MarketPriceDatabaseSnapshot = {
      products: initial.products.map((product) => ({
        ...product,
        variants: product.variants.map((variant) => ({
          ...variant,
          prices: [
            ...variant.prices,
            price("price_czk", "czk", 242),
            price("price_huf", "huf", 3651),
            price("price_ron", "ron", 52.52),
          ].sort((left, right) => left.id.localeCompare(right.id)),
        })),
      })),
    }
    expect(assertTestPriceConversionApplied(initial, after, plan)).toEqual([
      expect.objectContaining({ currencyCode: "czk", priceId: "price_czk" }),
      expect.objectContaining({ currencyCode: "huf", priceId: "price_huf" }),
      expect.objectContaining({ currencyCode: "ron", priceId: "price_ron" }),
    ])
  })

  it("rejects any mutation of EUR, product identity, or extra prices", () => {
    const initial = databaseSnapshot()
    const plan = buildTestPriceConversionPlan(initial, binding)
    const changedEur: MarketPriceDatabaseSnapshot = {
      products: initial.products.map((product) => ({
        ...product,
        variants: product.variants.map((variant) => ({
          ...variant,
          prices: variant.prices.map((candidate) =>
            candidate.id === "price_eur"
              ? { ...candidate, amount: 11 }
              : candidate
          ),
        })),
      })),
    }
    expect(() =>
      assertTestPriceConversionApplied(initial, changedEur, plan)
    ).toThrow("pre-existing price")
    const changedChannel: MarketPriceDatabaseSnapshot = {
      products: initial.products.map((product) => ({
        ...product,
        salesChannelIds: ["sc_other"],
      })),
    }
    expect(() =>
      assertTestPriceConversionApplied(initial, changedChannel, plan)
    ).toThrow("identity changed")
    const extraPrice: MarketPriceDatabaseSnapshot = {
      products: initial.products.map((product) => ({
        ...product,
        variants: product.variants.map((variant) => ({
          ...variant,
          prices: [...variant.prices, price("price_usd", "usd", 10)].sort(
            (left, right) => left.id.localeCompare(right.id)
          ),
        })),
      })),
    }
    expect(() =>
      assertTestPriceConversionApplied(initial, extraPrice, plan)
    ).toThrow("created price count mismatch")
  })

  it("requires exact test-only CLI modes and two independently reviewed hashes", () => {
    expect(
      parseTestPriceConversionCliOptions([
        "--dry-run",
        "--plan-output",
        "/tmp/price-plan.json",
      ])
    ).toEqual({ mode: "dry-run", planOutputPath: "/tmp/price-plan.json" })
    expect(
      parseTestPriceConversionCliOptions([
        "--apply",
        "--plan",
        "/tmp/price-plan.json",
        "--expected-plan-sha256",
        "a".repeat(64),
        "--expected-plan-artifact-sha256",
        "b".repeat(64),
        "--artifact-directory",
        "/tmp/price-apply",
      ])
    ).toMatchObject({ mode: "apply" })
    expect(() =>
      parseTestPriceConversionCliOptions([
        "--apply",
        "--plan",
        "/tmp/price-plan.json",
      ])
    ).toThrow("options must be exactly")
    expect(() =>
      parseTestPriceConversionCliOptions([
        "--dry-run",
        "--apply",
        "--plan-output",
        "/tmp/price-plan.json",
      ])
    ).toThrow("exactly one")
  })

  it("fingerprints database identity without including credentials", () => {
    const primary = buildTestPriceConversionDatabaseInstanceFingerprint({
      DATABASE_URL: "postgresql://first:secret@DB.internal/medusa",
      TEST_PRICE_CONVERSION_DATABASE_INSTANCE_ID: "test-primary",
    })
    expect(
      buildTestPriceConversionDatabaseInstanceFingerprint({
        DATABASE_URL: "postgresql://second:different@db.internal:5432/medusa",
        TEST_PRICE_CONVERSION_DATABASE_INSTANCE_ID: "test-primary",
      })
    ).toBe(primary)
    expect(
      buildTestPriceConversionDatabaseInstanceFingerprint({
        DATABASE_URL: "postgresql://first:secret@clone.internal/medusa",
        TEST_PRICE_CONVERSION_DATABASE_INSTANCE_ID: "test-clone",
      })
    ).not.toBe(primary)
  })

  it("never needs order or payment module dependencies", () => {
    const resolve = vi.fn((key: string) => {
      if (key === "pricing") {
        return { addPrices: vi.fn(), removePrices: vi.fn() }
      }
      throw new Error(`unexpected module ${key}`)
    })
    expect(() => resolve("order")).toThrow("unexpected module order")
    expect(() => resolve("payment")).toThrow("unexpected module payment")
  })
})
