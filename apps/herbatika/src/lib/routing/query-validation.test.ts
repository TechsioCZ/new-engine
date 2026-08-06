import { describe, expect, it } from "vitest"
import { validateEntityQuery } from "./query-validation"

describe("validateEntityQuery", () => {
  it("accepts per-kind and tracking parameters", () => {
    expect(
      validateEntityQuery("product", { varianta: "SKU", utm_source: "x" })
    ).toEqual({ valid: true })
    expect(
      validateEntityQuery("category", { znacka: "x", strana: "2" })
    ).toEqual({ valid: true })
  })
  it("rejects unknown parameters", () => {
    expect(validateEntityQuery("page", { debug: "1", another: "2" })).toEqual({
      valid: false,
      unknown: ["another", "debug"],
    })
  })
  it("keeps variant product-only", () => {
    expect(validateEntityQuery("article", { varianta: "SKU" })).toEqual({
      valid: false,
      unknown: ["varianta"],
    })
  })
})
