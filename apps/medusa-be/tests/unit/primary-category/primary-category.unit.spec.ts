import { describe, expect, it } from "vitest"
import {
  PrimaryCategoryValidationError,
  validatePrimaryCategoryAssignment,
} from "../../../src/api/admin/products/primary-category"

describe("validatePrimaryCategoryAssignment", () => {
  it("accepts a category assigned to the product", () => {
    expect(
      validatePrimaryCategoryAssignment("cat_leaf", ["cat_root", "cat_leaf"])
    ).toBe("cat_leaf")
  })

  it("allows the optional metadata value to be cleared", () => {
    expect(validatePrimaryCategoryAssignment(null, ["cat_leaf"])).toBeNull()
    expect(validatePrimaryCategoryAssignment(undefined, [])).toBeNull()
  })

  it("rejects IDs outside the product's category assignments", () => {
    expect(() =>
      validatePrimaryCategoryAssignment("cat_other", ["cat_leaf"])
    ).toThrow(PrimaryCategoryValidationError)
  })

  it.each([
    "",
    " cat_leaf",
    "cat_leaf ",
    123,
    {},
  ])("rejects an invalid primary category value: %p", (value) => {
    expect(() =>
      validatePrimaryCategoryAssignment(value, ["cat_leaf"])
    ).toThrow("must be a non-empty category ID string")
  })
})
