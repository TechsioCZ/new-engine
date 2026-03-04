import {
  hasAddressCountWarning,
  taxReliabilityBadge,
  viesValidationBadge,
} from "../company-check-status"

describe("company-check status helpers", () => {
  describe("hasAddressCountWarning", () => {
    it("returns true only when count is above warning threshold", () => {
      expect(hasAddressCountWarning(21)).toBe(true)
      expect(hasAddressCountWarning(20)).toBe(false)
      expect(hasAddressCountWarning(null)).toBe(false)
      expect(hasAddressCountWarning(undefined)).toBe(false)
    })
  })

  describe("taxReliabilityBadge", () => {
    it("returns reliable badge for true", () => {
      expect(taxReliabilityBadge(true)).toEqual({
        color: "green",
        label: "Reliable payer",
      })
    })

    it("returns unreliable badge for false", () => {
      expect(taxReliabilityBadge(false)).toEqual({
        color: "red",
        label: "Unreliable payer",
      })
    })

    it("returns unknown badge for nullish values", () => {
      expect(taxReliabilityBadge(undefined)).toEqual({
        color: "grey",
        label: "Unknown",
      })
    })
  })

  describe("viesValidationBadge", () => {
    it("returns invalid badge when result is missing", () => {
      expect(viesValidationBadge(undefined)).toEqual({
        color: "red",
        label: "Invalid VAT",
      })
    })

    it("returns group-valid badge for valid group registration", () => {
      expect(
        viesValidationBadge({ valid: true, is_group_registration: true })
      ).toEqual({
        color: "blue",
        label: "Valid (group)",
      })
    })

    it("returns valid or invalid badge for regular validation", () => {
      expect(
        viesValidationBadge({ valid: true, is_group_registration: false })
      ).toEqual({
        color: "green",
        label: "Valid VAT",
      })

      expect(
        viesValidationBadge({ valid: false, is_group_registration: false })
      ).toEqual({
        color: "red",
        label: "Invalid VAT",
      })
    })
  })
})
