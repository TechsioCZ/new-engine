import { describe, expect, it } from "vitest"

import {
  buildCatalogFilterExpressions,
  normalizeBrandParam,
  normalizeCategoryIdsParam,
  normalizeFormParam,
  normalizeIngredientParam,
  normalizeStatusParam,
  resolveCatalogSort,
} from "../../../src/api/store/catalog/products/utils"

describe("catalog products filter utils", () => {
  it("normalizes multi-value query params", () => {
    expect(normalizeStatusParam("action,in-stock,unknown")).toStrictEqual([
      "action",
      "in-stock",
    ])

    expect(
      normalizeFormParam(["form-capsules", "form-tablets,form-tablets"]),
    ).toStrictEqual(["form-capsules", "form-tablets"])

    expect(normalizeBrandParam("brand-natura,invalid")).toStrictEqual([
      "brand-natura",
    ])
    expect(
      normalizeIngredientParam(["ingredient-horcik", "other"]),
    ).toStrictEqual(["ingredient-horcik"])
    expect(normalizeCategoryIdsParam("pcat_01,pcat_02")).toStrictEqual([
      "pcat_01",
      "pcat_02",
    ])
  })

  it("builds meili filter expressions from normalized values", () => {
    const expressions = buildCatalogFilterExpressions({
      brandIds: ["brand-natura"],
      categoryIds: ["pcat_01", "pcat_02"],
      formIds: ["form-capsules"],
      ingredientIds: ["ingredient-horcik"],
      priceMax: 10,
      priceMin: 20,
      statusIds: ["action", "in-stock"],
    })

    expect(expressions).toStrictEqual([
      '(facet_category_ids = "pcat_01" OR facet_category_ids = "pcat_02")',
      '(facet_status = "action" OR facet_status = "in-stock")',
      'facet_form = "form-capsules"',
      'facet_brand = "brand-natura"',
      'facet_ingredient = "ingredient-horcik"',
      "facet_price >= 10",
      "facet_price <= 20",
    ])
  })

  it("maps API sort values to meili sort expressions", () => {
    expect(resolveCatalogSort("recommended")).toBeUndefined()
    expect(resolveCatalogSort("best-selling")).toBeUndefined()
    expect(
      (
        [
          "newest",
          "oldest",
          "price-asc",
          "price-desc",
          "title-asc",
          "title-desc",
        ] satisfies Parameters<typeof resolveCatalogSort>[0][]
      ).map((sort) => resolveCatalogSort(sort)),
    ).toStrictEqual([
      ["created_at:desc"],
      ["created_at:asc"],
      ["facet_price:asc"],
      ["facet_price:desc"],
      ["title:asc"],
      ["title:desc"],
    ])
  })
})
