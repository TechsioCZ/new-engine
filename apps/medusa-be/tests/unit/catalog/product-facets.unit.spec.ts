import { describe, expect, it } from "vitest"

import { buildProductFacetDocument } from "../../../src/modules/meilisearch/facets/product-facets"

describe("product facet document builder", () => {
  it("derives all primary facets from product payload", () => {
    const result = buildProductFacetDocument({
      brand: {
        handle: "natura-balance",
        title: "Natura Balance",
      },
      categories: [
        {
          id: "pcat_01",
          handle: "ucinne-zlozky-od-a-po-z-horcik",
          name: "Horčík",
        },
      ],
      metadata: {
        category_paths: [
          "Doplnky výživy > Účinné zložky od A po Z > Horčík",
          "Doplnky výživy > Forma > Kapsuly",
        ],
        flags: [
          {
            code: "action",
            active: true,
          },
        ],
        top_offer: {
          current_price: 15.9,
          stock: {
            amount: 2,
          },
        },
      },
      sales_channels: [
        {
          id: "sc_visible",
        },
      ],
      status: "published",
      title: "Horčík kapsuly",
    })

    expect(result.facet_product_status).toBe("published")
    expect(result.facet_sales_channel_ids).toStrictEqual(["sc_visible"])
    expect(result.facet_status).toStrictEqual(
      expect.arrayContaining(["in-stock", "action"]),
    )
    expect(result.facet_form).toStrictEqual(
      expect.arrayContaining(["form-capsules"]),
    )
    expect(result.facet_brand).toStrictEqual(["brand-natura-balance"])
    expect(result.facet_ingredient).toStrictEqual([
      "ingredient-ucinne-zlozky-od-a-po-z-horcik",
    ])
    expect(result.facet_category_ids).toStrictEqual(["pcat_01"])
    expect(result.facet_in_stock).toBeTruthy()
    expect(result.facet_price).toBe(15.9)
  })

  it("falls back to variant price and marks unavailable stock", () => {
    const result = buildProductFacetDocument({
      metadata: {
        top_offer: {
          stock: {
            amount: 0,
          },
        },
      },
      title: "Prírodný sirup",
      variants: [
        {
          prices: [
            {
              amount: 1290,
              currency_code: "eur",
            },
          ],
        },
      ],
    })

    expect(result.facet_in_stock).toBeFalsy()
    expect(result.facet_price).toBe(12.9)
  })

  it("parses localized decimal values from top offer metadata", () => {
    const result = buildProductFacetDocument({
      metadata: {
        top_offer: {
          current_price: "19,81",
          stock: {
            amount: 4,
          },
        },
      },
      title: "Bylinné kvapky",
    })

    expect(result.facet_price).toBe(19.81)
  })

  it("ignores non-positive top offer price and falls back to variant price", () => {
    const result = buildProductFacetDocument({
      metadata: {
        top_offer: {
          current_price: 0,
        },
      },
      title: "Pleťový olej",
      variants: [
        {
          prices: [
            {
              amount: 1990,
              currency_code: "eur",
            },
          ],
        },
      ],
    })

    expect(result.facet_price).toBe(19.9)
  })
})
