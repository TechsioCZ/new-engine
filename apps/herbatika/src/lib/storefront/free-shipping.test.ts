import { describe, expect, it } from "vitest"
import { resolveFreeShippingThresholdAmount } from "./free-shipping"

describe("resolveFreeShippingThresholdAmount", () => {
  it.each([
    ["CZK", 1190],
    ["czk", 1190],
    ["HUF", 17_900],
    ["huf", 17_900],
    ["RON", 249],
    ["ron", 249],
    ["EUR", 49],
    ["eur", 49],
  ] as const)("resolves the %s commerce threshold", (currencyCode, expected) => {
    expect(resolveFreeShippingThresholdAmount(currencyCode)).toBe(expected)
  })

  it("does not guess a threshold for an invalid or unknown currency", () => {
    expect(resolveFreeShippingThresholdAmount("lei")).toBeNull()
    expect(resolveFreeShippingThresholdAmount("USD")).toBeNull()
  })
})
