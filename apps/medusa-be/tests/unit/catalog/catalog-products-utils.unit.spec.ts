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
    expect(normalizeStatusParam("action,in-stock,unknown")).toEqual([
      "action",
      "in-stock",
    ])

    expect(normalizeFormParam(["form-capsules", "form-tablets,form-tablets"])).toEqual(
      ["form-capsules", "form-tablets"]
    )

    expect(normalizeBrandParam("brand-natura,invalid")).toEqual(["brand-natura"])
    expect(normalizeIngredientParam(["ingredient-horcik", "other"])).toEqual([
      "ingredient-horcik",
    ])
    expect(normalizeCategoryIdsParam("pcat_01,pcat_02")).toEqual([
      "pcat_01",
      "pcat_02",
    ])
  })

  it("builds meili filter expressions from normalized values", () => {
    const expressions = buildCatalogFilterExpressions({
      categoryIds: ["pcat_01", "pcat_02"],
      statusIds: ["action", "in-stock"],
      formIds: ["form-capsules"],
      brandIds: ["brand-natura"],
      ingredientIds: ["ingredient-horcik"],
      priceMin: 20,
      priceMax: 10,
    })

    expect(expressions).toEqual([
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
    expect(resolveCatalogSort("newest")).toEqual(["created_at:desc"])
    expect(resolveCatalogSort("oldest")).toEqual(["created_at:asc"])
    expect(resolveCatalogSort("price-asc")).toEqual(["facet_price:asc"])
    expect(resolveCatalogSort("price-desc")).toEqual(["facet_price:desc"])
    expect(resolveCatalogSort("title-asc")).toEqual(["title:asc"])
    expect(resolveCatalogSort("title-desc")).toEqual(["title:desc"])
  })
})
