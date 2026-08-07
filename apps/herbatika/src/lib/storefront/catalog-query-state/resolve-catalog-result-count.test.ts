import { describe, expect, it } from "vitest"
import { resolveCatalogResultCount } from "./params"

describe("resolveCatalogResultCount", () => {
  it("uses the backend total count when present", () => {
    expect(resolveCatalogResultCount({ count: 42, products: [{}, {}] })).toBe(
      42
    )
  })

  it("counts zero as a valid total", () => {
    expect(resolveCatalogResultCount({ count: 0, products: [{}] })).toBe(0)
  })

  it("falls back to the returned page length when count is missing", () => {
    expect(resolveCatalogResultCount({ products: [{}, {}, {}] })).toBe(3)
  })

  it("returns 0 when neither count nor products are present", () => {
    expect(resolveCatalogResultCount({})).toBe(0)
  })
})
