import { MedusaError } from "@medusajs/framework/utils"
import { describe, expect, it } from "vitest"

import {
  normalizeNonNegativeInteger,
  normalizePositiveInteger,
  normalizeProductListAccessType,
  normalizeProductListType,
} from "../normalizers"

const catchError = (callback: () => unknown) => {
  let error: unknown

  try {
    callback()
  } catch (caughtError) {
    error = caughtError
  }

  return error
}

describe("product-list normalizers", () => {
  describe(normalizeProductListAccessType, () => {
    it("defaults to private access", () => {
      expect(normalizeProductListAccessType()).toBe("private")
    })

    it.each(["private", "public"] as const)(
      "accepts %s access",
      (accessType) => {
        expect(normalizeProductListAccessType(accessType)).toBe(accessType)
      },
    )

    it("rejects unsupported access values", () => {
      expect(
        catchError(() => normalizeProductListAccessType("shared")),
      ).toMatchObject({
        message: "Unsupported product list access type: shared",
        type: MedusaError.Types.INVALID_DATA,
      })
    })
  })

  describe(normalizeProductListType, () => {
    it.each(["favorite", "custom"] as const)("accepts %s lists", (type) => {
      expect(normalizeProductListType(type)).toBe(type)
    })

    it("rejects non-string list types", () => {
      expect(catchError(() => normalizeProductListType(null))).toMatchObject({
        message: "Unsupported product list type: null",
        type: MedusaError.Types.INVALID_DATA,
      })
    })

    it("rejects unsupported list types", () => {
      expect(
        catchError(() => normalizeProductListType("collection")),
      ).toMatchObject({
        message: "Unsupported product list type: collection",
        type: MedusaError.Types.INVALID_DATA,
      })
    })
  })

  describe(normalizePositiveInteger, () => {
    it("returns the default when omitted", () => {
      expect(normalizePositiveInteger("quantity")).toBe(1)
      expect(normalizePositiveInteger("quantity", undefined, 3)).toBe(3)
    })

    it("accepts positive integers", () => {
      expect(normalizePositiveInteger("quantity", 1)).toBe(1)
      expect(normalizePositiveInteger("quantity", 6)).toBe(6)
    })

    it.each([0, -1, 1.5, "2"])("rejects %s", (value) => {
      expect(
        catchError(() => normalizePositiveInteger("quantity", value)),
      ).toMatchObject({
        message: "quantity must be a positive integer",
        type: MedusaError.Types.INVALID_DATA,
      })
    })
  })

  describe(normalizeNonNegativeInteger, () => {
    it("returns the default when omitted", () => {
      expect(normalizeNonNegativeInteger("sort_order")).toBe(0)
      expect(normalizeNonNegativeInteger("sort_order", undefined, 2)).toBe(2)
    })

    it("accepts zero and positive integers", () => {
      expect(normalizeNonNegativeInteger("sort_order", 0)).toBe(0)
      expect(normalizeNonNegativeInteger("sort_order", 4)).toBe(4)
    })

    it.each([-1, 1.5, "0"])("rejects %s", (value) => {
      expect(
        catchError(() => normalizeNonNegativeInteger("sort_order", value)),
      ).toMatchObject({
        message: "sort_order must be a non-negative integer",
        type: MedusaError.Types.INVALID_DATA,
      })
    })
  })
})
