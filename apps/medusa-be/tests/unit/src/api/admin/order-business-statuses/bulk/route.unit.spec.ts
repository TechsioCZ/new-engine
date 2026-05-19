import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@medusajs/framework/utils", () => ({
  ContainerRegistrationKeys: {
    QUERY: "query",
  },
  Modules: {
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
        resolve: vi.fn((key) =>
          key === "query" ? { graph } : { updateOrders }
        ),
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
})
