import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@medusajs/framework/utils", () => ({
  ContainerRegistrationKeys: {
    LOGGER: "logger",
    QUERY: "query",
  },
  Modules: {
    CACHING: "caching",
    ORDER: "order",
  },
}))

const createMockResponse = () => ({
  json: vi.fn().mockReturnThis(),
})

describe("POST /admin/order-business-statuses/bulk", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("updates eligible orders and skips blocked ones", async () => {
    const { POST } = await import(
      "../../../../../../../src/api/admin/order-business-statuses/bulk/route"
    )
    const clearCache = vi.fn().mockResolvedValue(undefined)
    const warn = vi.fn()
    const updateOrders = vi.fn().mockResolvedValue(undefined)
    const graph = vi
      .fn()
      .mockResolvedValueOnce({
        data: [
          {
            id: "order_1",
            display_id: 1001,
            payment_status: "captured",
          },
          {
            fulfillment_status: "delivered",
            id: "order_2",
            display_id: 1002,
          },
        ],
      })
      .mockResolvedValueOnce({
        data: [
          {
            id: "order_1",
            display_id: 1001,
            metadata: { order_business_status_manual: "processing" },
            payment_status: "captured",
          },
        ],
      })
    const req = {
      scope: {
        resolve: vi.fn((key) => {
          if (key === "query") {
            return { graph }
          }

          if (key === "order") {
            return { updateOrders }
          }

          if (key === "caching") {
            return { clear: clearCache }
          }

          if (key === "logger") {
            return { warn }
          }

          throw new Error(`Unexpected container key: ${String(key)}`)
        }),
      },
      validatedBody: {
        order_ids: ["order_1", "order_2", "order_missing"],
        status: "processing",
      },
    }
    const res = createMockResponse()

    await POST(req, res)

    expect(updateOrders).toHaveBeenCalledTimes(1)
    expect(updateOrders).toHaveBeenCalledWith("order_1", {
      metadata: { order_business_status_manual: "processing" },
    })
    expect(clearCache).toHaveBeenCalledWith({
      tags: ["order-expedition:summary"],
    })
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        count: 1,
        skipped_count: 2,
        skipped: [
          {
            id: "order_2",
            order_display_id: "#1002",
            reason: "delivered status has higher priority",
          },
          {
            id: "order_missing",
            order_display_id: "order_missing",
            reason: "Order was not found",
          },
        ],
      })
    )
  })

  it("keeps updating eligible orders when one update fails", async () => {
    const { POST } = await import(
      "../../../../../../../src/api/admin/order-business-statuses/bulk/route"
    )
    const clearCache = vi.fn().mockResolvedValue(undefined)
    const warn = vi.fn()
    const updateOrders = vi.fn((id: string) =>
      id === "order_2"
        ? Promise.reject(new Error("database conflict"))
        : Promise.resolve(undefined)
    )
    const graph = vi
      .fn()
      .mockResolvedValueOnce({
        data: [
          {
            id: "order_1",
            display_id: 1001,
            payment_status: "captured",
          },
          {
            id: "order_2",
            display_id: 1002,
            payment_status: "captured",
          },
        ],
      })
      .mockResolvedValueOnce({
        data: [
          {
            id: "order_1",
            display_id: 1001,
            metadata: { order_business_status_manual: "processing" },
            payment_status: "captured",
          },
        ],
      })
    const req = {
      scope: {
        resolve: vi.fn((key) => {
          if (key === "query") {
            return { graph }
          }

          if (key === "order") {
            return { updateOrders }
          }

          if (key === "caching") {
            return { clear: clearCache }
          }

          if (key === "logger") {
            return { warn }
          }

          throw new Error(`Unexpected container key: ${String(key)}`)
        }),
      },
      validatedBody: {
        order_ids: ["order_1", "order_2"],
        status: "processing",
      },
    }
    const res = createMockResponse()

    await POST(req, res)

    expect(updateOrders).toHaveBeenCalledTimes(2)
    expect(clearCache).toHaveBeenCalledWith({
      tags: ["order-expedition:summary"],
    })
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        count: 1,
        skipped_count: 1,
        skipped: [
          {
            id: "order_2",
            order_display_id: "#1002",
            reason: "Update failed: database conflict",
          },
        ],
      })
    )
  })
})
