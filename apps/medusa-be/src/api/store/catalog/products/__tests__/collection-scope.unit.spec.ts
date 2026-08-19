import { ProductStatus } from "@medusajs/framework/utils"
import { describe, expect, it } from "vitest"
import { buildProductFacetDocument } from "../../../../../modules/meilisearch/facets/product-facets"
import { PRODUCT_INDEX_SETTINGS } from "../../../../../modules/meilisearch/settings"
import {
  applyCollectionScopeToProductFilters,
  buildCatalogFilterExpressions,
} from "../utils"
import { StoreCatalogProductsSchema } from "../validators"

const emptyFacetInput = {
  categoryIds: [],
  statusIds: [],
  formIds: [],
  brandIds: [],
  ingredientIds: [],
}

describe("catalog collection scope", () => {
  it("accepts one exact canonical collection ID", () => {
    expect(
      StoreCatalogProductsSchema.parse({ collection_id: "pcol_AbC-123" })
        .collection_id
    ).toBe("pcol_AbC-123")
  })

  it.each([
    { collection_id: "" },
    { collection_id: " pcol_1" },
    { collection_id: "pcol/1" },
    { collection_id: ["pcol_1", "pcol_2"] },
  ])("rejects non-canonical or repeated collection scope: %j", (query) => {
    expect(StoreCatalogProductsSchema.safeParse(query).success).toBe(false)
  })

  it("filters Meilisearch before counts and facets are calculated", () => {
    expect(
      buildCatalogFilterExpressions({
        ...emptyFacetInput,
        collectionId: "pcol_1",
      })
    ).toEqual(['facet_collection_id = "pcol_1"'])
  })

  it("keeps exact collection and publishable-key channel scope together for authoritative reads", () => {
    expect(
      applyCollectionScopeToProductFilters(
        {
          sales_channel_id: ["sc_sk"],
          status: ProductStatus.PUBLISHED,
        },
        "pcol_1"
      )
    ).toEqual({
      collection_id: "pcol_1",
      sales_channel_id: ["sc_sk"],
      status: ProductStatus.PUBLISHED,
    })
  })

  it("indexes collection identity as a displayed and filterable product facet", () => {
    expect(
      buildProductFacetDocument({
        collection_id: "pcol_1",
        sales_channels: [{ id: "sc_sk" }],
      }).facet_collection_id
    ).toBe("pcol_1")
    expect(PRODUCT_INDEX_SETTINGS.displayedAttributes).toContain(
      "facet_collection_id"
    )
    expect(PRODUCT_INDEX_SETTINGS.filterableAttributes).toContain(
      "facet_collection_id"
    )
  })
})
