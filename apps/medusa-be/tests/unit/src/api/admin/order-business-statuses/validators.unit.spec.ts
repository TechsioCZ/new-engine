import { describe, expect, it } from "vitest"
import {
  GetAdminOrderBusinessStatusesByIdsSchema,
  PostAdminOrderBusinessStatusesBulkSchema,
} from "../../../../../../src/api/admin/order-business-statuses/validators"

describe("order business status validators", () => {
  describe("GetAdminOrderBusinessStatusesByIdsSchema", () => {
    it("accepts comma-separated strings and string arrays", () => {
      expect(
        GetAdminOrderBusinessStatusesByIdsSchema.parse({
          ids: "order_1,order_2",
        })
      ).toEqual({
        ids: ["order_1", "order_2"],
      })

      expect(
        GetAdminOrderBusinessStatusesByIdsSchema.parse({
          ids: ["order_1,order_2", "order_3"],
        })
      ).toEqual({
        ids: ["order_1", "order_2", "order_3"],
      })
    })

    it("rejects unexpected item types instead of coercing them", () => {
      expect(() =>
        GetAdminOrderBusinessStatusesByIdsSchema.parse({
          ids: ["order_1", 123],
        })
      ).toThrow()

      expect(() =>
        GetAdminOrderBusinessStatusesByIdsSchema.parse({
          ids: ["order_1", { id: "order_2" }],
        })
      ).toThrow()
    })
  })

  describe("PostAdminOrderBusinessStatusesBulkSchema", () => {
    it("accepts every existing target status and clearing the override", () => {
      for (const status of [
        "new",
        "awaiting_payment",
        "paid",
        "processing",
        "waiting_for_supplier",
        "shipped",
        "delivered",
        "canceled",
        null,
      ]) {
        expect(
          PostAdminOrderBusinessStatusesBulkSchema.parse({
            order_ids: ["order_1"],
            status,
          }).status
        ).toBe(status)
      }
    })

    it("rejects unknown target statuses", () => {
      expect(() =>
        PostAdminOrderBusinessStatusesBulkSchema.parse({
          order_ids: ["order_1"],
          status: "unknown",
        })
      ).toThrow()
    })
  })
})
