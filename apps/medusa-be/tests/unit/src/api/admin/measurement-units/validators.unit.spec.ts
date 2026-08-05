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
    ).toBeTruthy()
    expect(
      AdminSetProductVariantMeasurementSchema.safeParse({
        product_unit_quantity: 2.5,
      }).success
    ).toBeTruthy()
  })

  it.each(["2", true, false, null])(
    "rejects coerced create quantities such as %j",
    (baseQuantity) => {
      expect(
        AdminCreateMeasurementUnitSchema.safeParse({
          base_quantity: baseQuantity,
          code: "kg",
          name: "Kilogram",
          symbol: "kg",
        }).success
      ).toBeFalsy()
    }
  )

  it("rejects coerced quantities on update and variant assignment", () => {
    expect(
      AdminUpdateMeasurementUnitSchema.safeParse({
        base_quantity: "3",
      }).success
    ).toBeFalsy()
    expect(
      AdminSetProductVariantMeasurementSchema.safeParse({
        product_unit_quantity: true,
      }).success
    ).toBeFalsy()
  })

  it.each([
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    Number("1e999"),
  ])("rejects non-finite quantities such as %s", (quantity) => {
    expect(
      AdminCreateMeasurementUnitSchema.safeParse({
        base_quantity: quantity,
        code: "kg",
        name: "Kilogram",
        symbol: "kg",
      }).success
    ).toBeFalsy()
    expect(
      AdminUpdateMeasurementUnitSchema.safeParse({
        base_quantity: quantity,
      }).success
    ).toBeFalsy()
    expect(
      AdminSetProductVariantMeasurementSchema.safeParse({
        product_unit_quantity: quantity,
      }).success
    ).toBeFalsy()
  })

  it("rejects an empty update", () => {
    expect(AdminUpdateMeasurementUnitSchema.safeParse({}).success).toBeFalsy()
  })
})
