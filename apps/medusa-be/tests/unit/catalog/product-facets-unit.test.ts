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
          handle: "ucinne-zlozky-od-a-po-z-horcik",
          id: "pcat_01",
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
            active: true,
            code: "action",
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

    expect(result).toMatchObject({
      facet_brand: ["brand-natura-balance"],
      facet_category_ids: ["pcat_01"],
      facet_form: ["form-capsules"],
      facet_in_stock: true,
      facet_ingredient: ["ingredient-ucinne-zlozky-od-a-po-z-horcik"],
      facet_price: 15.9,
      facet_product_status: "published",
      facet_sales_channel_ids: ["sc_visible"],
      facet_status: ["in-stock", "action"],
    })
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
