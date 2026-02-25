import { MedusaError } from "@medusajs/framework/utils"
import {
  requireTrimmedValue,
  toTrimmedOrNull,
  toTrimmedString,
} from "../strings"

describe("strings utils", () => {
  it("trims values and returns empty string for nullish input", () => {
    expect(toTrimmedString("  value  ")).toBe("value")
    expect(toTrimmedString(null)).toBe("")
    expect(toTrimmedString(undefined)).toBe("")
  })

  it("returns null for empty trimmed values", () => {
    expect(toTrimmedOrNull("  value  ")).toBe("value")
    expect(toTrimmedOrNull("   ")).toBeNull()
    expect(toTrimmedOrNull(null)).toBeNull()
  })

  it("requires non-empty trimmed value", () => {
    expect(requireTrimmedValue("  Prague ", "city")).toBe("Prague")

    expect(() => requireTrimmedValue("   ", "city")).toThrow(MedusaError)
  })
})
