import { describe, expect, it } from "vitest"
import {
  buildTestPriceConversionPlan,
  convertEurAmountUp,
  hashTestPriceConversionPlan,
} from "../../../../../src/scripts/market-price-authority/test-conversion"
import type { MarketPriceDatabaseSnapshot } from "../../../../../src/scripts/market-price-authority/types"
import { price } from "./fixtures"

const SHA_256 = /^[a-f0-9]{64}$/

const binding = {
  backendReleaseSha: "6827bfd450a163e7dd350a396ca1f9363e06235e",
  databaseInstanceFingerprint: "a".repeat(64),
  environmentId: "test-engine" as const,
  inventoryFingerprintSha256: "b".repeat(64),
}

const snapshot = (
  prices = [price("price_eur", "eur", 10)]
): MarketPriceDatabaseSnapshot => ({
  products: [
    {
      id: "prod_1",
      salesChannelIds: ["sc_shared"],
      status: "published",
      variants: [{ id: "variant_1", priceSetId: "pset_1", prices }],
    },
  ],
})

describe("test-only ECB price conversion planner", () => {
  it("uses exact rational arithmetic and rounds up at each target quantum", () => {
    expect(convertEurAmountUp(10, "czk")).toBe(242)
    expect(convertEurAmountUp(10, "huf")).toBe(3651)
    expect(convertEurAmountUp(10, "ron")).toBe(52.52)
    expect(convertEurAmountUp(0.01, "czk")).toBe(1)
    expect(convertEurAmountUp(0.01, "huf")).toBe(4)
    expect(convertEurAmountUp(0.01, "ron")).toBe(0.06)
  })

  it("plans only missing target base prices and preserves EUR and existing targets", () => {
    const current = snapshot([
      price("price_eur", "eur", 10),
      price("price_czk", "czk", 250),
      { ...price("price_ron_list", "ron", 40), priceListId: "plist_1" },
    ])
    const plan = buildTestPriceConversionPlan(current, binding)
    expect(plan.summary).toEqual({
      create: 2,
      sourceVariants: 1,
      targetCurrencies: 3,
      unchanged: 1,
      unavailable: 0,
    })
    expect(plan.mutations).toEqual([
      expect.objectContaining({
        action: "unchanged",
        currencyCode: "czk",
        currentAmount: 250,
        desiredAmount: 250,
        sourceEurPriceId: "price_eur",
      }),
      expect.objectContaining({
        action: "create",
        currencyCode: "huf",
        desiredAmount: 3651,
      }),
      expect.objectContaining({
        action: "create",
        currencyCode: "ron",
        desiredAmount: 52.52,
      }),
    ])
  })

  it("marks zero-EUR variants unavailable instead of inventing prices", () => {
    const plan = buildTestPriceConversionPlan(
      snapshot([price("price_eur", "eur", 0)]),
      binding
    )
    expect(plan.summary.unavailable).toBe(3)
    expect(plan.summary.create).toBe(0)
    expect(
      plan.mutations.every(({ desiredAmount }) => desiredAmount === null)
    ).toBe(true)
  })

  it("fails closed on missing, duplicate, negative, or over-precise EUR authority", () => {
    expect(() => buildTestPriceConversionPlan(snapshot([]), binding)).toThrow(
      "exactly one"
    )
    expect(() =>
      buildTestPriceConversionPlan(
        snapshot([
          price("price_eur_1", "eur", 10),
          price("price_eur_2", "eur", 10),
        ]),
        binding
      )
    ).toThrow("exactly one")
    expect(() =>
      buildTestPriceConversionPlan(
        snapshot([price("price_eur", "eur", -1)]),
        binding
      )
    ).toThrow("non-negative")
    expect(() =>
      buildTestPriceConversionPlan(
        snapshot([price("price_eur", "eur", 1.001)]),
        binding
      )
    ).toThrow("EUR 0.01 quantum")
  })

  it("binds plan hashes to the database, frozen FX authority, release, and inventory", () => {
    const first = buildTestPriceConversionPlan(snapshot(), binding)
    const second = buildTestPriceConversionPlan(snapshot(), {
      ...binding,
      inventoryFingerprintSha256: "c".repeat(64),
    })
    expect(hashTestPriceConversionPlan(first)).toMatch(SHA_256)
    expect(hashTestPriceConversionPlan(second)).not.toBe(
      hashTestPriceConversionPlan(first)
    )
    expect(first.fxAuthority.rates).toEqual([
      expect.objectContaining({
        currencyCode: "czk",
        denominator: 1000,
        numerator: 24_153,
      }),
      expect.objectContaining({
        currencyCode: "huf",
        denominator: 10,
        numerator: 3651,
      }),
      expect.objectContaining({
        currencyCode: "ron",
        denominator: 2000,
        numerator: 10_503,
      }),
    ])
  })

  it("cannot be planned for a non-test environment", () => {
    expect(() =>
      buildTestPriceConversionPlan(snapshot(), {
        ...binding,
        environmentId: "production" as "test-engine",
      })
    ).toThrow("restricted to test-engine")
  })
})
