import { describe, expect, it } from "vitest"
import {
  AdminCreateBrandSchema,
  AdminUpdateBrandProductsSchema,
  AdminUpdateBrandSchema,
} from "../validators"

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

describe("Brand product delta request validation", () => {
  it("accepts more than 500 IDs without a whole-set replacement ceiling", () => {
    const addProductIds = Array.from(
      { length: 750 },
      (_, index) => `prod_${index}`
    )

    expect(
      AdminUpdateBrandProductsSchema.parse({
        add: addProductIds,
      })
    ).toEqual({
      add: addProductIds,
      remove: [],
    })
  })

  it("rejects an ID present in both delta sets", () => {
    const result = AdminUpdateBrandProductsSchema.safeParse({
      add: ["prod_1"],
      remove: ["prod_1"],
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ["remove"],
          }),
        ])
      )
    }
  })

  it("rejects the obsolete whole-set request contract", () => {
    expect(
      AdminUpdateBrandProductsSchema.safeParse({
        product_ids: ["prod_1"],
      }).success
    ).toBe(false)
  })
})
