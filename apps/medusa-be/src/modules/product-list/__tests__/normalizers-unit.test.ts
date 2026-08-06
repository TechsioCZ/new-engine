import { describe, expect, it } from "vitest"

import {
  normalizeNonNegativeInteger,
  normalizePositiveInteger,
  normalizeProductListAccessType,
  normalizeProductListType,
} from "../normalizers"

const absentValueArguments: [undefined] = [undefined]

describe("product-list normalizers", () => {
  describe(normalizeProductListAccessType, () => {
    it("defaults to private access", () => {
      expect(normalizeProductListAccessType(...absentValueArguments)).toBe(
        "private",
      )
    })

    it.each(["private", "public"] as const)("accepts %s access", (value) => {
      expect(normalizeProductListAccessType(value)).toBe(value)
    })

    it("rejects unsupported access values", () => {
      expect(() => normalizeProductListAccessType("shared")).toThrow(
        "Unsupported product list access type: shared",
      )
    })
  })

  describe(normalizeProductListType, () => {
    it.each(["favorite", "custom"] as const)("accepts %s lists", (value) => {
      expect(normalizeProductListType(value)).toBe(value)
    })

    it("rejects non-string list types", () => {
      expect(() => normalizeProductListType(null)).toThrow(
        "Unsupported product list type: null",
      )
    })

    it("rejects unsupported list types", () => {
      expect(() => normalizeProductListType("collection")).toThrow(
        "Unsupported product list type: collection",
      )
    })
  })

  describe(normalizePositiveInteger, () => {
    it("returns the default when omitted", () => {
      expect(
        normalizePositiveInteger("quantity", ...absentValueArguments),
      ).toBe(1)
      expect(normalizePositiveInteger("quantity", undefined, 3)).toBe(3)
    })

    it("accepts positive integers", () => {
      expect(normalizePositiveInteger("quantity", 1)).toBe(1)
      expect(normalizePositiveInteger("quantity", 6)).toBe(6)
    })

    it.each([0, -1, 1.5, "2"])("rejects %s", (value) => {
      expect(() => normalizePositiveInteger("quantity", value)).toThrow(
        "quantity must be a positive integer",
      )
    })
  })

  describe(normalizeNonNegativeInteger, () => {
    it("returns the default when omitted", () => {
      expect(
        normalizeNonNegativeInteger("sort_order", ...absentValueArguments),
      ).toBe(0)
      expect(normalizeNonNegativeInteger("sort_order", undefined, 2)).toBe(2)
    })

    it("accepts zero and positive integers", () => {
      expect(normalizeNonNegativeInteger("sort_order", 0)).toBe(0)
      expect(normalizeNonNegativeInteger("sort_order", 4)).toBe(4)
    })

    it.each([-1, 1.5, "0"])("rejects %s", (value) => {
      expect(() => normalizeNonNegativeInteger("sort_order", value)).toThrow(
        "sort_order must be a non-negative integer",
      )
    })
  })
})
