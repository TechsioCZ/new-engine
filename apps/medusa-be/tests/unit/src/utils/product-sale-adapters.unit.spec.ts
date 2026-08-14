import { describe, expect, it } from "vitest"

import { StoreCatalogProductsSchema } from "../../../../src/api/store/catalog/products/validators"
import {
  AbstractProductSaleAdapter,
  DiscountProductSaleAdapter,
  isActiveSalePriceRecord,
  normalizeProductSaleAdapterSelectionInput,
  type ProductSaleAdapterAlgorithm,
  ProductSaleAdapterBuilder,
  ProductSaleAdapterName,
  ProductSalePriceListType,
  selectActiveSalePriceProducts,
} from "../../../../src/utils/product-sale-adapters"

class AlwaysOnSaleAdapter extends AbstractProductSaleAdapter {
  override readonly name = ProductSaleAdapterName.DISCOUNT
  override readonly algo: ProductSaleAdapterAlgorithm = () => true
}

describe("product sale adapters", () => {
  describe("query param normalization", () => {
    it("selects all registered adapters for true", () => {
      expect(normalizeProductSaleAdapterSelectionInput("true")).toBe(true)
      expect(normalizeProductSaleAdapterSelectionInput(true)).toBe(true)
    })

    it("normalizes comma, repeated, and bracket list adapter selections", () => {
      expect(normalizeProductSaleAdapterSelectionInput("discount")).toEqual([
        ProductSaleAdapterName.DISCOUNT,
      ])
      expect(
        normalizeProductSaleAdapterSelectionInput(["discount", " discount "])
      ).toEqual([ProductSaleAdapterName.DISCOUNT])
      expect(normalizeProductSaleAdapterSelectionInput("[discount]")).toEqual([
        ProductSaleAdapterName.DISCOUNT,
      ])
    })
  })

  describe("StoreCatalogProductsSchema on_sale", () => {
    it("parses true as all adapters", () => {
      const result = StoreCatalogProductsSchema.safeParse({ on_sale: "true" })

      if (!result.success) {
        throw result.error
      }
      expect(result.data.on_sale).toBe(true)
    })

    it("parses selected discount adapters", () => {
      const result = StoreCatalogProductsSchema.safeParse({
        on_sale: ["discount", "discount"],
      })

      if (!result.success) {
        throw result.error
      }
      expect(result.data.on_sale).toEqual([ProductSaleAdapterName.DISCOUNT])
    })

    it("rejects unknown sale adapters", () => {
      const result = StoreCatalogProductsSchema.safeParse({ on_sale: "bogus" })

      expect(result.success).toBe(false)
    })
  })

  describe("ProductSaleAdapterBuilder", () => {
    it("builds a matcher from registered adapter classes", () => {
      const matcher = new ProductSaleAdapterBuilder([
        new AlwaysOnSaleAdapter(),
      ]).build([ProductSaleAdapterName.DISCOUNT])

      expect(matcher.enabled).toBe(true)
      expect(matcher.names).toEqual([ProductSaleAdapterName.DISCOUNT])
      expect(matcher.matches({})).toBe(true)
      expect(matcher.matchNames({})).toEqual([ProductSaleAdapterName.DISCOUNT])
    })

    it("uses all registered adapters when selection is true", () => {
      const matcher =
        ProductSaleAdapterBuilder.withDefaultAdapters().build(true)

      expect(matcher.enabled).toBe(true)
      expect(matcher.names).toEqual([ProductSaleAdapterName.DISCOUNT])
    })

    it("does not infer discounts from calculated price without price-list eligibility", async () => {
      const result =
        await ProductSaleAdapterBuilder.withDefaultAdapters().fetchProducts({
          graph: {
            entity: "product",
            fields: ["id", "variants.calculated_price.calculated_amount"],
          },
          query: {
            graph: async () => ({
              data: [
                {
                  id: "prod_sale",
                  variants: [
                    {
                      calculated_price: {
                        calculated_amount: 80,
                        original_amount: 100,
                      },
                    },
                  ],
                },
              ],
              metadata: { count: 1 },
            }),
          },
          selection: [ProductSaleAdapterName.DISCOUNT],
        })

      expect(result.data).toEqual([])
      expect(result.metadata?.count).toBe(0)
    })

    it("uses eligible product ids from active sale price lists when provided", async () => {
      const result =
        await ProductSaleAdapterBuilder.withDefaultAdapters().fetchProducts({
          eligibility: {
            productIds: ["prod_sale"],
          },
          graph: {
            entity: "product",
            fields: ["id"],
          },
          query: {
            graph: async () => ({
              data: [{ id: "prod_sale" }, { id: "prod_regular" }],
              metadata: { count: 2 },
            }),
          },
          selection: [ProductSaleAdapterName.DISCOUNT],
        })

      expect(result.data).toEqual([
        expect.objectContaining({
          id: "prod_sale",
          sale_adapters: [ProductSaleAdapterName.DISCOUNT],
        }),
      ])
      expect(result.metadata?.count).toBe(2)
    })
  })

  describe("sale price list selection", () => {
    const now = new Date("2026-08-14T12:00:00.000Z")

    it("selects products from active sale price lists only", () => {
      const result = selectActiveSalePriceProducts(
        [
          {
            amount: 80,
            currency_code: "eur",
            price_set_id: "pset_sale",
            price_list: {
              type: ProductSalePriceListType.SALE,
              status: "active",
              starts_at: "2026-08-01T00:00:00.000Z",
              ends_at: "2026-08-20T00:00:00.000Z",
              price_list_rules: [],
            },
            price_set: {
              id: "pset_sale",
              variant: {
                id: "variant_sale",
                product_id: "prod_sale",
              },
            },
          },
          {
            amount: 70,
            currency_code: "eur",
            price_set_id: "pset_b2b",
            price_list: {
              type: ProductSalePriceListType.OVERRIDE,
              status: "active",
              price_list_rules: [],
            },
            price_set: {
              id: "pset_b2b",
              variant: {
                id: "variant_b2b",
                product_id: "prod_b2b",
              },
            },
          },
          {
            amount: 60,
            currency_code: "eur",
            price_set_id: "pset_expired",
            price_list: {
              type: ProductSalePriceListType.SALE,
              status: "active",
              ends_at: "2026-08-13T00:00:00.000Z",
              price_list_rules: [],
            },
            price_set: {
              id: "pset_expired",
              variant: {
                id: "variant_expired",
                product_id: "prod_expired",
              },
            },
          },
        ],
        {
          currencyCode: "EUR",
          now,
          referencePrices: [
            {
              amount: 100,
              currency_code: "eur",
              price_set_id: "pset_sale",
            },
            {
              amount: 100,
              currency_code: "eur",
              price_set_id: "pset_b2b",
            },
            {
              amount: 100,
              currency_code: "eur",
              price_set_id: "pset_expired",
            },
          ],
        }
      )

      expect(result.productIds).toEqual(["prod_sale"])
      expect(result.variantIds).toEqual(["variant_sale"])
    })

    it("requires sale prices to be lower than their reference price", () => {
      const result = selectActiveSalePriceProducts(
        [
          {
            amount: 100,
            currency_code: "eur",
            price_set_id: "pset_equal",
            price_list: {
              type: ProductSalePriceListType.SALE,
              status: "active",
              price_list_rules: [],
            },
            price_set: {
              id: "pset_equal",
              variant: {
                id: "variant_equal",
                product_id: "prod_equal",
              },
            },
          },
          {
            amount: 120,
            currency_code: "eur",
            price_set_id: "pset_higher",
            price_list: {
              type: ProductSalePriceListType.SALE,
              status: "active",
              price_list_rules: [],
            },
            price_set: {
              id: "pset_higher",
              variant: {
                id: "variant_higher",
                product_id: "prod_higher",
              },
            },
          },
          {
            amount: 90,
            currency_code: "eur",
            price_set_id: "pset_lower",
            price_list: {
              type: ProductSalePriceListType.SALE,
              status: "active",
              price_list_rules: [],
            },
            price_set: {
              id: "pset_lower",
              variant: {
                id: "variant_lower",
                product_id: "prod_lower",
              },
            },
          },
        ],
        {
          now,
          referencePrices: [
            {
              amount: 100,
              currency_code: "eur",
              price_set_id: "pset_equal",
            },
            {
              amount: 100,
              currency_code: "eur",
              price_set_id: "pset_higher",
            },
            {
              amount: 100,
              currency_code: "eur",
              price_set_id: "pset_lower",
            },
          ],
        }
      )

      expect(result.productIds).toEqual(["prod_lower"])
      expect(result.variantIds).toEqual(["variant_lower"])
    })

    it("requires matching customer groups for sale price-list rules", () => {
      const record = {
        currency_code: "eur",
        price_list: {
          type: ProductSalePriceListType.SALE,
          status: "active",
          price_list_rules: [
            {
              attribute: "customer.groups.id",
              value: ["cusgroup_b2b"],
            },
          ],
        },
        price_set: {
          variant: {
            id: "variant_sale",
            product_id: "prod_sale",
          },
        },
      }

      expect(
        isActiveSalePriceRecord(record, {
          customerGroupIds: ["cusgroup_b2b"],
          now,
        })
      ).toBe(true)
      expect(
        isActiveSalePriceRecord(record, {
          customerGroupIds: ["cusgroup_other"],
          now,
        })
      ).toBe(false)
    })
  })

  describe("DiscountProductSaleAdapter", () => {
    it("has a name and algo", () => {
      const adapter = new DiscountProductSaleAdapter()

      expect(adapter.name).toBe(ProductSaleAdapterName.DISCOUNT)
      expect(typeof adapter.algo).toBe("function")
    })

    it("matches products eligible through active sale price-list selection", () => {
      const adapter = new DiscountProductSaleAdapter()

      expect(
        adapter.matches(
          { id: "prod_sale" },
          { eligibility: { productIds: ["prod_sale"] } }
        )
      ).toBe(true)
    })

    it("does not match products without sale price-list eligibility", () => {
      const adapter = new DiscountProductSaleAdapter()

      expect(
        adapter.matches(
          {
            id: "prod_sale",
            variants: [
              {
                calculated_price: {
                  calculated_amount: 80,
                  original_amount: 100,
                },
              },
            ],
          },
          { eligibility: { productIds: ["prod_other"] } }
        )
      ).toBe(false)
      expect(adapter.matches({ id: "prod_sale" })).toBe(false)
    })
  })
})
