import { describe, expect, it } from "vitest"
import { AdminCreateBrandSchema, AdminUpdateBrandSchema } from "../validators"

const outsideEuBrand = {
  title: "Outside EU",
  gpsr_manufactured_outside_eu: true,
  gpsr_european_reseller_manufacturing_company_name: "EU Company",
  gpsr_european_reseller_postal_address: "EU Address",
  gpsr_european_reseller_contact_email: "eu@example.com",
}

describe("brand GPSR request validation", () => {
  it("normalizes blank optional fields to null", () => {
    const result = AdminUpdateBrandSchema.parse({
      gpsr_contact_email: "   ",
    })

    expect(result.gpsr_contact_email).toBeNull()
  })

  it.each([
    "gpsr_contact_email",
    "gpsr_european_reseller_contact_email",
  ] as const)("rejects an invalid %s", (field) => {
    const result = AdminCreateBrandSchema.safeParse({
      ...outsideEuBrand,
      [field]: "not-an-email",
    })

    expect(result.success).toBe(false)
  })

  it.each([
    "gpsr_european_reseller_manufacturing_company_name",
    "gpsr_european_reseller_postal_address",
    "gpsr_european_reseller_contact_email",
  ] as const)("reports missing outside-EU field %s", (field) => {
    const result = AdminCreateBrandSchema.safeParse({
      ...outsideEuBrand,
      [field]: null,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === field)).toBe(
        true
      )
    }
  })

  it("accepts a partial update for workflow effective-state validation", () => {
    expect(
      AdminUpdateBrandSchema.safeParse({
        title: "Updated title",
      }).success
    ).toBe(true)
  })

  it("rejects EU representative fields for an inside-EU brand", () => {
    expect(
      AdminCreateBrandSchema.safeParse({
        ...outsideEuBrand,
        gpsr_manufactured_outside_eu: false,
      }).success
    ).toBe(false)
  })
})
