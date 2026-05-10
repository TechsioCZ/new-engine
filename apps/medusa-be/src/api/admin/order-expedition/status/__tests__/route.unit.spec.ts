import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@medusajs/framework/utils", () => ({
  ContainerRegistrationKeys: {
    QUERY: "query",
  },
}))

const {
  mockArchiveRun,
  mockBulkCancelRun,
  mockBulkUpdateRun,
  mockCompleteRun,
} = vi.hoisted(() => ({
  mockArchiveRun: vi.fn(),
  mockBulkCancelRun: vi.fn(),
  mockBulkUpdateRun: vi.fn(),
  mockCompleteRun: vi.fn(),
}))

vi.mock("@medusajs/medusa/core-flows", () => ({
  archiveOrderWorkflow: vi.fn(() => ({ run: mockArchiveRun })),
  completeOrderWorkflow: vi.fn(() => ({ run: mockCompleteRun })),
}))

vi.mock("../../../../../workflows/order-expedition/bulk-cancel-orders", () => ({
  bulkCancelOrdersWorkflow: vi.fn(() => ({ run: mockBulkCancelRun })),
}))

vi.mock(
  "../../../../../workflows/order-expedition/bulk-update-order-statuses",
  () => ({
    bulkUpdateOrderStatusesWorkflow: vi.fn(() => ({ run: mockBulkUpdateRun })),
    isOrderExpeditionDirectUpdateStatus: vi.fn((status: string) =>
      ["pending", "draft", "requires_action"].includes(status)
    ),
  })
)

const createMockResponse = () => ({
  json: vi.fn().mockReturnThis(),
  status: vi.fn().mockReturnThis(),
})

const createMockRequest = (
  validatedBody: Record<string, unknown>,
  graph: ReturnType<typeof vi.fn>
) => ({
  scope: {
    resolve: vi.fn(() => ({ graph })),
  },
  validatedBody,
})

describe("POST /admin/order-expedition/status", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("prevalidates every selected order and blocks the whole batch when one is missing", async () => {
    const { POST } = await import("../route")
    const graph = vi.fn().mockResolvedValue({
      data: [{ id: "order_1", display_id: 1001, status: "pending" }],
    })
    const req = createMockRequest(
      {
        order_ids: ["order_1", "order_missing"],
        target_status: "completed",
      },
      graph
    )
    const res = createMockResponse()

    await POST(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        blocked_orders: [
          {
            id: "order_missing",
            order_display_id: "order_missing",
            reason: "Order was not found",
          },
        ],
        code: "order_expedition_status_blocked",
      })
    )
    expect(mockCompleteRun).not.toHaveBeenCalled()
    expect(mockArchiveRun).not.toHaveBeenCalled()
    expect(mockBulkCancelRun).not.toHaveBeenCalled()
    expect(mockBulkUpdateRun).not.toHaveBeenCalled()
  })

  it("runs completed as one bulk workflow after prevalidation", async () => {
    const { POST } = await import("../route")
    const graph = vi
      .fn()
      .mockResolvedValueOnce({
        data: [
          { id: "order_1", display_id: 1001, status: "pending" },
          { id: "order_2", display_id: 1002, status: "pending" },
        ],
      })
      .mockResolvedValueOnce({
        data: [
          { id: "order_1", display_id: 1001, status: "completed" },
          { id: "order_2", display_id: 1002, status: "completed" },
        ],
      })
    const req = createMockRequest(
      {
        order_ids: ["order_1", "order_2"],
        target_status: "completed",
      },
      graph
    )
    const res = createMockResponse()

    await POST(req, res)

    expect(mockCompleteRun).toHaveBeenCalledWith({
      input: { orderIds: ["order_1", "order_2"] },
    })
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        count: 2,
        target_status: "completed",
      })
    )
  })

  it("runs direct Medusa status updates through the custom bulk update workflow", async () => {
    const { POST } = await import("../route")
    const graph = vi
      .fn()
      .mockResolvedValueOnce({
        data: [
          { id: "order_1", display_id: 1001, status: "pending" },
          { id: "order_2", display_id: 1002, status: "completed" },
        ],
      })
      .mockResolvedValueOnce({
        data: [
          { id: "order_1", display_id: 1001, status: "requires_action" },
          { id: "order_2", display_id: 1002, status: "requires_action" },
        ],
      })
    const req = createMockRequest(
      {
        order_ids: ["order_1", "order_2"],
        target_status: "requires_action",
      },
      graph
    )
    const res = createMockResponse()

    await POST(req, res)

    expect(mockBulkUpdateRun).toHaveBeenCalledWith({
      input: {
        order_ids: ["order_1", "order_2"],
        target_status: "requires_action",
      },
    })
    expect(mockCompleteRun).not.toHaveBeenCalled()
    expect(mockArchiveRun).not.toHaveBeenCalled()
    expect(mockBulkCancelRun).not.toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        count: 2,
        target_status: "requires_action",
      })
    )
  })

  it("blocks cancellation before mutation when a selected order has active fulfillments", async () => {
    const { POST } = await import("../route")
    const graph = vi.fn().mockResolvedValue({
      data: [
        {
          fulfillments: [{ canceled_at: null, id: "ful_1" }],
          id: "order_1",
          display_id: 1001,
          status: "pending",
        },
      ],
    })
    const req = createMockRequest(
      {
        order_ids: ["order_1"],
        target_status: "canceled",
      },
      graph
    )
    const res = createMockResponse()

    await POST(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        blocked_orders: [
          {
            id: "order_1",
            order_display_id: "#1001",
            reason: "Orders with active fulfillments cannot be canceled",
          },
        ],
      })
    )
    expect(mockBulkCancelRun).not.toHaveBeenCalled()
  })

  it("blocks direct status updates for final archived orders", async () => {
    const { POST } = await import("../route")
    const graph = vi.fn().mockResolvedValue({
      data: [
        {
          id: "order_1",
          display_id: 1001,
          status: "archived",
        },
      ],
    })
    const req = createMockRequest(
      {
        order_ids: ["order_1"],
        target_status: "pending",
      },
      graph
    )
    const res = createMockResponse()

    await POST(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        blocked_orders: [
          {
            id: "order_1",
            order_display_id: "#1001",
            reason: "Archived orders cannot be changed",
          },
        ],
      })
    )
    expect(mockBulkUpdateRun).not.toHaveBeenCalled()
  })

  it("runs cancel through the custom bulk cancel workflow after prevalidation", async () => {
    const { POST } = await import("../route")
    const graph = vi
      .fn()
      .mockResolvedValueOnce({
        data: [
          {
            fulfillments: [],
            id: "order_1",
            display_id: 1001,
            status: "pending",
          },
        ],
      })
      .mockResolvedValueOnce({
        data: [
          {
            id: "order_1",
            display_id: 1001,
            status: "canceled",
          },
        ],
      })
    const req = createMockRequest(
      {
        order_ids: ["order_1"],
        target_status: "canceled",
      },
      graph
    )
    const res = createMockResponse()

    await POST(req, res)

    expect(mockBulkCancelRun).toHaveBeenCalledWith({
      input: { order_ids: ["order_1"] },
    })
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        count: 1,
        target_status: "canceled",
      })
    )
  })
})
