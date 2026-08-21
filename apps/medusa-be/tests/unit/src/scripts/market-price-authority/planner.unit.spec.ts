import { describe, expect, it } from "vitest"
import {
  buildMarketPricePlan,
  hashMarketPricePlan,
  serializeMarketPriceDatabaseSnapshot,
} from "../../../../../src/scripts/market-price-authority/planner"
import { AUTHORITY_SHA, authority, price, snapshot } from "./fixtures"

const SHA_256 = /^[a-f0-9]{64}$/

const required = <Value>(value: Value | undefined, label: string): Value => {
  if (value === undefined) {
    throw new Error(`missing ${label} fixture`)
  }
  return value
}

describe("four-market price dry-run planner", () => {
  it("plans exact market prices without FX or defaults", () => {
    const plan = buildMarketPricePlan(authority(), AUTHORITY_SHA, snapshot())
    expect(plan.summary).toEqual({
      create: 0,
      markets: 4,
      remove: 0,
      unchanged: 3,
      update: 1,
      visibleProducts: 4,
      visibleVariants: 4,
    })
    expect(
      plan.mutations.find(({ marketCode }) => marketCode === "cz")
    ).toMatchObject({
      action: "update",
      currentAmount: 120,
      currencyCode: "czk",
      desiredAmount: 129.9,
    })
    expect(
      plan.mutations.find(({ marketCode }) => marketCode === "ro")
    ).toMatchObject({ action: "unchanged", desiredAmount: null })
  })

  it("fails on missing or unexpected visible identities", () => {
    const current = snapshot()
    expect(() =>
      buildMarketPricePlan(authority(), AUTHORITY_SHA, {
        products: current.products.map((product) => ({
          ...product,
          salesChannelIds: product.salesChannelIds.filter(
            (channel) => channel !== "sc_ro"
          ),
        })),
      })
    ).toThrow("ro database scope is empty")

    const reviewed = authority()
    expect(() =>
      buildMarketPricePlan(
        {
          ...reviewed,
          markets: reviewed.markets.map((market) =>
            market.marketCode === "sk" ? { ...market, prices: [] } : market
          ),
        },
        AUTHORITY_SHA,
        current
      )
    ).toThrow("sk authority scope is empty")
  })

  it.each([
    {
      label: "price-list",
      mutation: { priceListId: "plist_1" },
    },
    { label: "quantity", mutation: { minQuantity: 2 } },
    {
      label: "rule",
      mutation: {
        rules: [{ attribute: "region_id", operator: "eq", value: "reg_cz" }],
      },
    },
  ])("refuses $label scoped target-currency prices", ({ mutation }) => {
    const current = snapshot()
    const firstProduct = required(current.products[0], "first product")
    const firstVariant = required(firstProduct.variants[0], "first variant")
    expect(() =>
      buildMarketPricePlan(authority(), AUTHORITY_SHA, {
        products: [
          {
            ...firstProduct,
            variants: [
              {
                ...firstVariant,
                prices: firstVariant.prices.map((candidate) =>
                  candidate.currencyCode === "czk"
                    ? { ...candidate, ...mutation }
                    : candidate
                ),
              },
            ],
          },
        ],
      })
    ).toThrow("scoped czk price")
  })

  it("refuses duplicate base prices and never substitutes another currency", () => {
    const current = snapshot()
    const product = required(current.products[0], "product")
    const variant = required(product.variants[0], "variant")
    expect(() =>
      buildMarketPricePlan(authority(), AUTHORITY_SHA, {
        products: [
          {
            ...product,
            variants: [
              {
                ...variant,
                prices: [...variant.prices, price("price_cz_2", "czk", 129.9)],
              },
            ],
          },
        ],
      })
    ).toThrow("multiple base czk prices")

    const withoutCz = {
      products: [
        {
          ...product,
          variants: [
            {
              ...variant,
              prices: variant.prices.filter(
                ({ currencyCode }) => currencyCode !== "czk"
              ),
            },
          ],
        },
      ],
    }
    const plan = buildMarketPricePlan(authority(), AUTHORITY_SHA, withoutCz)
    expect(
      plan.mutations.find(({ marketCode }) => marketCode === "cz")
    ).toMatchObject({ action: "create", currentAmount: null })
  })

  it("plans explicit removal for unavailable and refuses scoped unavailable prices", () => {
    const current = snapshot()
    const product = required(current.products[0], "product")
    const variant = required(product.variants[0], "variant")
    const withRon = {
      products: [
        {
          ...product,
          variants: [
            {
              ...variant,
              prices: [...variant.prices, price("price_ro", "ron", 10)],
            },
          ],
        },
      ],
    }
    expect(
      buildMarketPricePlan(authority(), AUTHORITY_SHA, withRon).mutations.find(
        ({ marketCode }) => marketCode === "ro"
      )
    ).toMatchObject({ action: "remove", currentAmount: 10 })

    expect(() =>
      buildMarketPricePlan(authority(), AUTHORITY_SHA, {
        products: [
          {
            ...product,
            variants: [
              {
                ...variant,
                prices: [
                  ...variant.prices,
                  {
                    ...price("price_ro_list", "ron", 10),
                    priceListId: "plist",
                  },
                ],
              },
            ],
          },
        ],
      })
    ).toThrow("scoped ron price")
  })

  it("hashes canonical current DB state and semantic plan changes", () => {
    const current = snapshot()
    const reversed = {
      products: current.products.map((product) => ({
        ...product,
        salesChannelIds: [...product.salesChannelIds].reverse(),
        variants: product.variants.map((variant) => ({
          ...variant,
          prices: [...variant.prices].reverse(),
        })),
      })),
    }
    expect(serializeMarketPriceDatabaseSnapshot(reversed)).toBe(
      serializeMarketPriceDatabaseSnapshot(current)
    )
    const plan = buildMarketPricePlan(authority(), AUTHORITY_SHA, current)
    expect(hashMarketPricePlan(plan)).toMatch(SHA_256)
    expect(
      hashMarketPricePlan(
        buildMarketPricePlan(authority(), AUTHORITY_SHA, {
          products: current.products.map((product) => ({
            ...product,
            variants: product.variants.map((variant) => ({
              ...variant,
              prices: variant.prices.map((candidate) =>
                candidate.id === "price_sk"
                  ? { ...candidate, amount: 13 }
                  : candidate
              ),
            })),
          })),
        })
      )
    ).not.toBe(hashMarketPricePlan(plan))
  })
})
