import { buildProductFacetDocument } from "../../../src/modules/meilisearch/facets/product-facets"

describe("product facet document builder", () => {
  it("derives all primary facets from product payload", () => {
    const result = buildProductFacetDocument({
      title: "Horčík kapsuly",
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
      producer: {
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
    })

    expect(result.facet_status).toEqual(expect.arrayContaining(["in-stock", "action"]))
    expect(result.facet_form).toEqual(expect.arrayContaining(["form-capsules"]))
    expect(result.facet_brand).toEqual(["brand-natura-balance"])
    expect(result.facet_ingredient).toEqual([
      "ingredient-ucinne-zlozky-od-a-po-z-horcik",
    ])
    expect(result.facet_category_ids).toEqual(["pcat_01"])
    expect(result.facet_in_stock).toBe(true)
    expect(result.facet_price).toBe(15.9)
  })

  it("falls back to variant price and marks unavailable stock", () => {
    const result = buildProductFacetDocument({
      title: "Prírodný sirup",
      metadata: {
        top_offer: {
          stock: {
            amount: 0,
          },
        },
      },
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

    expect(result.facet_in_stock).toBe(false)
    expect(result.facet_price).toBe(12.9)
  })

  it("parses localized decimal values from top offer metadata", () => {
    const result = buildProductFacetDocument({
      title: "Bylinné kvapky",
      metadata: {
        top_offer: {
          current_price: "19,81",
          stock: {
            amount: 4,
          },
        },
      },
    })

    expect(result.facet_price).toBe(19.81)
  })

  it("ignores non-positive top offer price and falls back to variant price", () => {
    const result = buildProductFacetDocument({
      title: "Pleťový olej",
      metadata: {
        top_offer: {
          current_price: 0,
        },
      },
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
