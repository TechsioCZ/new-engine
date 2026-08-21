import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { describe, expect, it, vi } from "vitest"
import { collectMarketPriceDatabaseSnapshot } from "../../../../../src/scripts/market-price-authority/collector"

const queryFixture = () => ({
  product: [
    {
      id: "prod_1",
      sales_channels: [{ id: "sc_sk" }, { id: "sc_ro" }],
      status: "published",
    },
  ],
  product_variant: [{ id: "variant_1", product_id: "prod_1" }],
  product_variant_price_set: [
    { price_set_id: "pset_1", variant_id: "variant_1" },
  ],
  price: [
    {
      amount: { value: "12.90" },
      currency_code: "EUR",
      id: "price_eur",
      max_quantity: null,
      min_quantity: null,
      price_list_id: null,
      price_rules: [],
      price_set_id: "pset_1",
    },
    {
      amount: 59.5,
      currency_code: "ron",
      id: "price_ron_rule",
      max_quantity: null,
      min_quantity: null,
      price_list_id: "plist_1",
      price_rules: [
        { attribute: "region_id", operator: "eq", value: "reg_ro" },
      ],
      price_set_id: "pset_1",
    },
  ],
})

const container = (rows = queryFixture()) => {
  const graph = vi.fn(async ({ entity }: { entity: keyof typeof rows }) => ({
    data: rows[entity] ?? [],
  }))
  return {
    container: {
      resolve: vi.fn(() => ({ graph })),
    },
    graph,
  }
}

describe("market price read-only database collector", () => {
  it("collects exact visibility, price-set identity, and raw qualifiers", async () => {
    const fixture = container()
    await expect(
      collectMarketPriceDatabaseSnapshot(fixture.container as never)
    ).resolves.toEqual({
      products: [
        {
          id: "prod_1",
          salesChannelIds: ["sc_ro", "sc_sk"],
          status: "published",
          variants: [
            {
              id: "variant_1",
              priceSetId: "pset_1",
              prices: [
                {
                  amount: 12.9,
                  currencyCode: "eur",
                  id: "price_eur",
                  maxQuantity: null,
                  minQuantity: null,
                  priceListId: null,
                  rules: [],
                },
                {
                  amount: 59.5,
                  currencyCode: "ron",
                  id: "price_ron_rule",
                  maxQuantity: null,
                  minQuantity: null,
                  priceListId: "plist_1",
                  rules: [
                    {
                      attribute: "region_id",
                      operator: "eq",
                      value: "reg_ro",
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    })
    expect(
      fixture.graph.mock.calls.map(
        ([input]) => (input as { entity: string }).entity
      )
    ).toEqual([
      "product",
      "product_variant",
      "product_variant_price_set",
      "price",
    ])
    expect(fixture.container.resolve).toHaveBeenCalledExactlyOnceWith(
      ContainerRegistrationKeys.QUERY
    )
  })

  it("rejects orphaned or duplicate price-set links", async () => {
    const duplicate = queryFixture()
    duplicate.product_variant_price_set.push({
      price_set_id: "pset_2",
      variant_id: "variant_1",
    })
    await expect(
      collectMarketPriceDatabaseSnapshot(
        container(duplicate).container as never
      )
    ).rejects.toThrow("duplicate price-set link")

    const missing = queryFixture()
    missing.product_variant_price_set = []
    await expect(
      collectMarketPriceDatabaseSnapshot(container(missing).container as never)
    ).rejects.toThrow("missing its price-set link")
  })

  it("rejects noncanonical identifiers and duplicate price rows", async () => {
    const badId = queryFixture()
    const badProduct = badId.product[0]
    if (!badProduct) {
      throw new Error("missing bad-id fixture product")
    }
    badProduct.id = " prod_1 "
    await expect(
      collectMarketPriceDatabaseSnapshot(container(badId).container as never)
    ).rejects.toThrow("non-empty string")

    const duplicate = queryFixture()
    const duplicatePrice = duplicate.price[0]
    if (!duplicatePrice) {
      throw new Error("missing duplicate-price fixture")
    }
    duplicate.price.push({ ...duplicatePrice })
    await expect(
      collectMarketPriceDatabaseSnapshot(
        container(duplicate).container as never
      )
    ).rejects.toThrow("duplicate price id")
  })

  it("uses only Query graph reads and preserves paging/filter contracts", async () => {
    const fixture = container()
    await collectMarketPriceDatabaseSnapshot(fixture.container as never)
    const priceCall = fixture.graph.mock.calls.find(
      ([input]) => (input as { entity: string }).entity === "price"
    )?.[0] as { filters: unknown; fields: string[]; pagination: unknown }
    expect(priceCall.filters).toEqual({ price_set_id: { $in: ["pset_1"] } })
    expect(priceCall.fields).toEqual(
      expect.arrayContaining([
        "price_list_id",
        "price_rules.attribute",
        "price_rules.operator",
        "price_rules.value",
      ])
    )
    expect(priceCall.pagination).toEqual({ skip: 0, take: 500 })
  })
})
