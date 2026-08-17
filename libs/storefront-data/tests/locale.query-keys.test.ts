import { createCatalogQueryKeys } from "../src/catalog/query-keys"
import { createCategoryQueryKeys } from "../src/categories/query-keys"
import { createProductQueryKeys } from "../src/products/query-keys"

describe("localized query keys", () => {
  it.each([
    ["products", createProductQueryKeys("locale-test").list, { limit: 12 }],
    ["categories", createCategoryQueryKeys("locale-test").list, { limit: 12 }],
    ["catalog", createCatalogQueryKeys("locale-test").list, { limit: 12 }],
  ])("separates %s data by locale", (_name, createKey, params) => {
    expect(createKey({ ...params, locale: "sk-SK" })).not.toEqual(
      createKey({ ...params, locale: "cs-CZ" })
    )
  })
})
