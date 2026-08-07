import { describe, expect, it } from "vitest"
import { GetAdminOrderExpeditionOrdersSchema } from "../../../../../../src/api/admin/order-expedition/validators"

describe("GetAdminOrderExpeditionOrdersSchema", () => {
  it("accepts native order search and created date filters", () => {
    expect(
      GetAdminOrderExpeditionOrdersSchema.parse({
        created_at: {
          $gte: "2026-08-01T00:00:00.000Z",
          $lte: "2026-08-31T23:59:59.999Z",
        },
        q: "John Doe",
      })
    ).toEqual({
      created_at: {
        $gte: "2026-08-01T00:00:00.000Z",
        $lte: "2026-08-31T23:59:59.999Z",
      },
      q: "John Doe",
    })
  })

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
