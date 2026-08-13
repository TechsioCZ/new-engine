import { describe, expect, it } from "vitest"
import {
  GetAdminOrderExpeditionOrdersSchema,
  PostAdminOrderExpeditionPdfSchema,
} from "../../../../../../src/api/admin/order-expedition/validators"
import { ORDER_EXPEDITION_MAX_SEPARATE_PDF_ORDER_IDS } from "../../../../../../src/utils/order-expedition"

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

  it("parses the pending unpaid queue flag explicitly", () => {
    expect(
      GetAdminOrderExpeditionOrdersSchema.parse({ pending_unpaid: "true" })
    ).toEqual({ pending_unpaid: true })
    expect(
      GetAdminOrderExpeditionOrdersSchema.parse({ pending_unpaid: "false" })
    ).toEqual({ pending_unpaid: false })
    expect(() =>
      GetAdminOrderExpeditionOrdersSchema.parse({ pending_unpaid: "yes" })
    ).toThrow()
  })
})

describe("PostAdminOrderExpeditionPdfSchema", () => {
  it("defaults to one combined PDF", () => {
    expect(
      PostAdminOrderExpeditionPdfSchema.parse({ order_ids: ["order_1"] })
    ).toEqual({
      mode: "combined",
      order_ids: ["order_1"],
    })
  })

  it("accepts separate PDFs and rejects unsupported modes", () => {
    expect(
      PostAdminOrderExpeditionPdfSchema.parse({
        mode: "separate",
        order_ids: ["order_1", "order_2"],
      })
    ).toEqual({
      mode: "separate",
      order_ids: ["order_1", "order_2"],
    })

    expect(() =>
      PostAdminOrderExpeditionPdfSchema.parse({
        mode: "individual-downloads",
        order_ids: ["order_1"],
      })
    ).toThrow()
  })

  it("bounds separate PDF archives without reducing the combined export limit", () => {
    const orderIds = Array.from(
      { length: ORDER_EXPEDITION_MAX_SEPARATE_PDF_ORDER_IDS + 1 },
      (_, index) => `order_${index}`
    )

    expect(() =>
      PostAdminOrderExpeditionPdfSchema.parse({
        mode: "separate",
        order_ids: orderIds,
      })
    ).toThrow(
      `Separate PDF export supports at most ${ORDER_EXPEDITION_MAX_SEPARATE_PDF_ORDER_IDS} orders`
    )
    expect(
      PostAdminOrderExpeditionPdfSchema.parse({
        mode: "combined",
        order_ids: orderIds,
      })
    ).toEqual({ mode: "combined", order_ids: orderIds })
  })

  it("accepts a separate PDF archive at the exact order limit", () => {
    const orderIds = Array.from(
      { length: ORDER_EXPEDITION_MAX_SEPARATE_PDF_ORDER_IDS },
      (_, index) => `order_${index}`
    )

    expect(
      PostAdminOrderExpeditionPdfSchema.parse({
        mode: "separate",
        order_ids: orderIds,
      })
    ).toEqual({ mode: "separate", order_ids: orderIds })
  })
})
