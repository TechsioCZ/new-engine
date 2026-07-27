import { describe, expect, it } from "vitest"
import {
  AdminCreateMeasurementUnitSchema,
  AdminSetProductVariantMeasurementSchema,
  AdminUpdateMeasurementUnitSchema,
} from "../../../../../../src/api/admin/measurement-units/validators"

describe("measurement unit request validation", () => {
  it("accepts JSON numbers for positive quantities", () => {
    expect(
      AdminCreateMeasurementUnitSchema.safeParse({
        base_quantity: 1,
        code: "kg",
        name: "Kilogram",
        symbol: "kg",
      }).success
    ).toBe(true)
    expect(
      AdminSetProductVariantMeasurementSchema.safeParse({
        product_unit_quantity: 2.5,
      }).success
    ).toBe(true)
  })

  it.each([
    "2",
    true,
    false,
    null,
  ])("rejects coerced create quantities such as %j", (baseQuantity) => {
    expect(
      AdminCreateMeasurementUnitSchema.safeParse({
        base_quantity: baseQuantity,
        code: "kg",
        name: "Kilogram",
        symbol: "kg",
      }).success
    ).toBe(false)
  })

  it("rejects coerced quantities on update and variant assignment", () => {
    expect(
      AdminUpdateMeasurementUnitSchema.safeParse({
        base_quantity: "3",
      }).success
    ).toBe(false)
    expect(
      AdminSetProductVariantMeasurementSchema.safeParse({
        product_unit_quantity: true,
      }).success
    ).toBe(false)
  })

  it("rejects an empty update", () => {
    expect(AdminUpdateMeasurementUnitSchema.safeParse({}).success).toBe(false)
  })
})
