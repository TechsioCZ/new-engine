import type { HttpTypes } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"
import { describe, expect, expectTypeOf, it } from "vitest"

import type { StoreProductProjection } from "../product-graph-validation"
import {
  parseStoreProductDetailGraphResponse,
  parseStoreProductListGraphResponse,
} from "../product-graph-validation"

describe("store product graph response validation", () => {
  it("accepts sparse list projections", () => {
    const result = parseStoreProductListGraphResponse({
      data: [{ id: "prod_1" }, { title: "Projected title" }],
      metadata: { count: 2, skip: 0, take: 10 },
    })

    expect(result).toStrictEqual({
      metadata: { count: 2, skip: 0, take: 10 },
      products: [{ id: "prod_1" }, { title: "Projected title" }],
    })
  })

  it("returns an honest projection type rather than a full product", () => {
    const { products } = parseStoreProductListGraphResponse({
      data: [{ title: "Projected title" }],
    })

    expectTypeOf(products).toEqualTypeOf<StoreProductProjection[]>()
    expectTypeOf<StoreProductProjection>().not.toExtend<HttpTypes.StoreProduct>()
  })

  it("accepts sparse detail projections", () => {
    expect(
      parseStoreProductDetailGraphResponse(
        {
          data: [
            {
              variants: [{ id: "variant_1" }],
            },
          ],
        },
        "prod_1",
      ),
    ).toStrictEqual({ variants: [{ id: "variant_1" }] })
  })

  it("validates projected images and options without erasing their shape", () => {
    const product = parseStoreProductDetailGraphResponse(
      {
        data: [
          {
            images: [
              {
                id: "image_1",
                metadata: { accessibility: { decorative: false } },
                rank: 0,
                url: "https://example.com/product.jpg",
              },
            ],
            options: [
              {
                id: "option_1",
                metadata: null,
                title: "Size",
                values: [
                  {
                    id: "option_value_1",
                    metadata: { position: 1 },
                    value: "Large",
                  },
                ],
              },
            ],
          },
        ],
      },
      "prod_1",
    )

    expect(product).toStrictEqual({
      images: [
        {
          id: "image_1",
          metadata: { accessibility: { decorative: false } },
          rank: 0,
          url: "https://example.com/product.jpg",
        },
      ],
      options: [
        {
          id: "option_1",
          metadata: null,
          title: "Size",
          values: [
            {
              id: "option_value_1",
              metadata: { position: 1 },
              value: "Large",
            },
          ],
        },
      ],
    })
  })

  it("rejects malformed projected image and option fields", () => {
    expect(() =>
      parseStoreProductDetailGraphResponse(
        {
          data: [
            {
              images: [{ rank: "first" }],
              options: [{ values: [{ id: 42 }] }],
            },
          ],
        },
        "prod_malformed",
      ),
    ).toThrow("Product query returned invalid store product data.")
  })

  it("accepts Date, string, and null graph date values", () => {
    const createdAt = new Date("2026-08-07T12:00:00.000Z")
    const product = parseStoreProductDetailGraphResponse(
      {
        data: [
          {
            created_at: createdAt,
            deleted_at: null,
            updated_at: "2026-08-07T13:00:00.000Z",
          },
        ],
      },
      "prod_1",
    )

    expect(product).toStrictEqual({
      created_at: createdAt,
      deleted_at: null,
      updated_at: "2026-08-07T13:00:00.000Z",
    })
  })

  it("reports a truly missing detail row as not found", () => {
    let error: unknown
    try {
      parseStoreProductDetailGraphResponse({ data: [] }, "prod_missing")
    } catch (caughtError: unknown) {
      error = caughtError
    }

    expect(error).toBeInstanceOf(MedusaError)
    expect(error).toMatchObject({
      message: "Product with id: prod_missing was not found",
      type: MedusaError.Types.NOT_FOUND,
    })
  })

  it("reports a malformed present detail row as unexpected state", () => {
    let error: unknown
    try {
      parseStoreProductDetailGraphResponse(
        { data: [{ id: 42 }] },
        "prod_malformed",
      )
    } catch (caughtError: unknown) {
      error = caughtError
    }

    expect(error).toBeInstanceOf(MedusaError)
    expect(error).toMatchObject({
      message: "Product query returned invalid store product data.",
      type: MedusaError.Types.UNEXPECTED_STATE,
    })
  })
})
