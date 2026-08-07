import { MedusaError } from "@medusajs/framework/utils"
import { describe, expect, it, vi } from "vitest"

import type { StoreProductProjection } from "../product-graph-validation"
import type { ProductProjectionTaxDependencies } from "../product-projection-decorators"
import {
  decorateProductProjectionsWithAutomaticTax,
  decorateProductProjectionsWithTaxPrices,
} from "../product-projection-decorators"

const createGetTaxLinesMock = () =>
  vi.fn<ProductProjectionTaxDependencies["getTaxLines"]>()

const assertTaxRequestShape: (
  candidate: unknown,
) => asserts candidate is Parameters<
  typeof decorateProductProjectionsWithTaxPrices
>[0] = (
  candidate,
): asserts candidate is Parameters<
  typeof decorateProductProjectionsWithTaxPrices
>[0] => {
  if (candidate === null || typeof candidate !== "object") {
    throw new TypeError("Expected a request object")
  }
  if (!("scope" in candidate) || !("taxContext" in candidate)) {
    throw new TypeError("Tax request mock is incomplete")
  }
}

describe("product projection tax decoration", () => {
  it("does not resolve the tax service when automatic taxes are disabled", async () => {
    const resolve = vi.fn<() => never>(() => {
      throw new Error("Tax service should not be resolved")
    })
    const requestCandidate: unknown = {
      scope: { resolve },
      taxContext: {
        taxInclusivityContext: { automaticTaxes: false },
        taxLineContext: {},
      },
    }
    assertTaxRequestShape(requestCandidate)

    await decorateProductProjectionsWithTaxPrices(requestCandidate, [])

    expect(resolve).not.toHaveBeenCalled()
  })

  it("does not inspect or fetch taxes when automatic taxes are disabled", async () => {
    const products: StoreProductProjection[] = [
      {
        variants: [{ calculated_price: { calculated_amount: 100 } }],
      },
    ]
    const getTaxLines = createGetTaxLinesMock()

    await decorateProductProjectionsWithAutomaticTax(products, {
      automaticTaxes: false,
      getTaxLines,
    })

    expect(getTaxLines).not.toHaveBeenCalled()
    expect(products).toStrictEqual([
      {
        variants: [{ calculated_price: { calculated_amount: 100 } }],
      },
    ])
  })

  it("retains the vendor empty tax fetch for active sparse projections", async () => {
    const getTaxLines = createGetTaxLinesMock().mockResolvedValue([])

    await decorateProductProjectionsWithAutomaticTax(
      [{ title: "Sparse product" }],
      { automaticTaxes: true, getTaxLines },
    )

    expect(getTaxLines).toHaveBeenCalledExactlyOnceWith([])
  })

  it("reports missing tax projection fields as typed unexpected state", async () => {
    const getTaxLines = createGetTaxLinesMock().mockResolvedValue([])
    let error: unknown

    try {
      await decorateProductProjectionsWithAutomaticTax(
        [
          {
            id: "prod_1",
            variants: [
              {
                calculated_price: { calculated_amount: 100 },
                id: "variant_1",
              },
            ],
          },
        ],
        { automaticTaxes: true, getTaxLines },
      )
    } catch (caughtError: unknown) {
      error = caughtError
    }

    expect(getTaxLines).not.toHaveBeenCalled()
    expect(error).toBeInstanceOf(MedusaError)
    expect(error).toMatchObject({
      message:
        "Product query returned data that cannot be decorated with tax prices.",
      type: MedusaError.Types.UNEXPECTED_STATE,
    })
  })

  it("matches Medusa tax mutation behavior for calculated and original amounts", async () => {
    const products: StoreProductProjection[] = [
      {
        id: "prod_1",
        type_id: null,
        variants: [
          {
            calculated_price: {
              calculated_amount: 100,
              currency_code: "czk",
              is_calculated_price_tax_inclusive: false,
              is_original_price_tax_inclusive: true,
              original_amount: 120,
            },
            id: "variant_1",
          },
        ],
      },
    ]
    const getTaxLines = createGetTaxLinesMock().mockResolvedValue([
      { line_item_id: "variant_1", rate: 20 },
    ])

    await decorateProductProjectionsWithAutomaticTax(products, {
      automaticTaxes: true,
      getTaxLines,
    })

    expect(getTaxLines).toHaveBeenCalledWith([
      {
        currency_code: "czk",
        id: "variant_1",
        product_id: "prod_1",
        product_type_id: null,
        quantity: 1,
        unit_price: 100,
      },
    ])
    expect(products[0]?.variants?.[0]?.calculated_price).toMatchObject({
      calculated_amount_with_tax: 120,
      calculated_amount_without_tax: 100,
      original_amount_with_tax: 120,
      original_amount_without_tax: 100,
    })
  })
})
