import { describe, expect, it } from "vitest"

import { resolveLineItemMetadata } from "./add-product-to-cart-validation"

describe("line-item metadata resolution", () => {
  it("preserves recursive JSON top-offer metadata", () => {
    const metadata = resolveLineItemMetadata({
      id: "prod_1",
      metadata: {
        top_offer: {
          code: "SKU-1",
          stock: {
            amount: 7,
            warehouses: [
              { location: "Prague", name: "Main", value: 4 },
              { location: "Brno", name: "Backup", value: 3 },
            ],
          },
          visible: true,
        },
      },
      title: "Product",
      variants: [],
    })

    expect(metadata).toStrictEqual({
      top_offer: {
        code: "SKU-1",
        stock: {
          amount: 7,
          warehouses: [
            { location: "Prague", name: "Main", value: 4 },
            { location: "Brno", name: "Backup", value: 3 },
          ],
        },
        visible: true,
      },
    })
  })

  it("rejects non-JSON top-offer metadata", () => {
    expect(() =>
      resolveLineItemMetadata({
        id: "prod_1",
        metadata: { top_offer: { invalid: () => "not JSON" } },
        title: "Product",
        variants: [],
      }),
    ).toThrow("Product top_offer metadata must contain JSON data")
  })
})
