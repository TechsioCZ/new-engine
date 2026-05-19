import { describe, expect, it } from "vitest"
import { GetAdminOrderBusinessStatusesByIdsSchema } from "../../../../../../src/api/admin/order-business-statuses/validators"

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
})
