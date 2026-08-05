import { describe, expect, it } from "vitest"
import { GetAdminOrderExpeditionOrdersSchema } from "../../../../../../src/api/admin/order-expedition/validators"

describe("GetAdminOrderExpeditionOrdersSchema", () => {
  it.each([
    "created_at",
    "-created_at",
    "display_id",
    "-display_id",
    "customer",
    "-customer",
    "carrier",
    "-carrier",
    "business_status",
    "-business_status",
    "fulfillment",
    "-fulfillment",
    "payment",
    "-payment",
    "total",
    "-total",
  ])("accepts supported order value %s", (order) => {
    expect(GetAdminOrderExpeditionOrdersSchema.parse({ order })).toEqual({
      order,
    })
  })

  it("rejects unsupported order fields", () => {
    expect(() =>
      GetAdminOrderExpeditionOrdersSchema.parse({ order: "email" })
    ).toThrow()
  })

  it("uses the first order value when the query parser returns an array", () => {
    expect(
      GetAdminOrderExpeditionOrdersSchema.parse({
        order: ["-created_at", "display_id"],
      })
    ).toEqual({ order: "-created_at" })
  })
})
