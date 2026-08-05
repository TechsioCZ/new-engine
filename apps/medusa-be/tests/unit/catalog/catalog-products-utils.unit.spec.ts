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
    expect(resolveCatalogSort("newest")).toStrictEqual(["created_at:desc"])
    expect(resolveCatalogSort("oldest")).toStrictEqual(["created_at:asc"])
    expect(resolveCatalogSort("price-asc")).toStrictEqual(["facet_price:asc"])
    expect(resolveCatalogSort("price-desc")).toStrictEqual(["facet_price:desc"])
    expect(resolveCatalogSort("title-asc")).toStrictEqual(["title:asc"])
    expect(resolveCatalogSort("title-desc")).toStrictEqual(["title:desc"])
  })
})
