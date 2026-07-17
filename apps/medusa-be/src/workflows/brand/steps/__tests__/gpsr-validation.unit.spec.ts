import { describe, expect, it } from "vitest"
import { normalizeBrandWriteInput, validateBrandGpsrState } from "../validation"

const validOutsideEuState = {
  handle: "outside-eu",
  gpsr_manufactured_outside_eu: true,
  gpsr_european_reseller_manufacturing_company_name: "EU Company",
  gpsr_european_reseller_postal_address: "EU Address",
  gpsr_european_reseller_contact_email: "eu@example.com",
}

describe("workflow-owned brand GPSR validation", () => {
  it("normalizes blank direct-workflow values to null", () => {
    expect(
      normalizeBrandWriteInput({
        gpsr_contact_email: "  ",
      }).gpsr_contact_email
    ).toBeNull()
  })

  it("accepts complete outside-EU state", () => {
    expect(() => validateBrandGpsrState(validOutsideEuState)).not.toThrow()
  })

  it.each([
    "gpsr_european_reseller_manufacturing_company_name",
    "gpsr_european_reseller_postal_address",
    "gpsr_european_reseller_contact_email",
  ] as const)("rejects missing outside-EU field %s", (field) => {
    expect(() =>
      validateBrandGpsrState({
        ...validOutsideEuState,
        [field]: null,
      })
    ).toThrow(field)
  })

  it.each([
    "gpsr_contact_email",
    "gpsr_european_reseller_contact_email",
  ] as const)("rejects invalid %s", (field) => {
    expect(() =>
      validateBrandGpsrState({
        ...validOutsideEuState,
        [field]: "invalid",
      })
    ).toThrow(field)
  })

  it("rejects EU representative fields when the outside-EU flag is false", () => {
    expect(() =>
      validateBrandGpsrState({
        ...validOutsideEuState,
        gpsr_manufactured_outside_eu: false,
      })
    ).toThrow("gpsr_manufactured_outside_eu")
  })

  it("rejects a partial EU representative set even when the flag is false", () => {
    expect(() =>
      validateBrandGpsrState({
        gpsr_european_reseller_contact_email: "eu@example.com",
        gpsr_manufactured_outside_eu: false,
      })
    ).toThrow("all EU representative fields or none")
  })

  it("accepts absent EU representative fields when manufactured inside the EU", () => {
    expect(() =>
      validateBrandGpsrState({
        gpsr_manufactured_outside_eu: false,
      })
    ).not.toThrow()
  })

  it("defaults an omitted outside-EU flag to false", () => {
    expect(() => validateBrandGpsrState({})).not.toThrow()
  })
})
