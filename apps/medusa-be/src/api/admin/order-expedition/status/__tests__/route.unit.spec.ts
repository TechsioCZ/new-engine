jest.mock("@medusajs/framework/utils", () => ({
  ContainerRegistrationKeys: {
    QUERY: "query",
  },
}))

const mockArchiveRun = jest.fn()
const mockBulkCancelRun = jest.fn()
const mockBulkUpdateRun = jest.fn()
const mockCompleteRun = jest.fn()

jest.mock("@medusajs/medusa/core-flows", () => ({
  archiveOrderWorkflow: jest.fn(() => ({ run: mockArchiveRun })),
  completeOrderWorkflow: jest.fn(() => ({ run: mockCompleteRun })),
}))

jest.mock(
  "../../../../../workflows/order-expedition/bulk-cancel-orders",
  () => ({
    bulkCancelOrdersWorkflow: jest.fn(() => ({ run: mockBulkCancelRun })),
  })
)

jest.mock(
  "../../../../../workflows/order-expedition/bulk-update-order-statuses",
  () => ({
    bulkUpdateOrderStatusesWorkflow: jest.fn(() => ({
      run: mockBulkUpdateRun,
    })),
    isOrderExpeditionDirectUpdateStatus: jest.fn((status: string) =>
      ["pending", "draft", "requires_action"].includes(status)
    ),
  })
)

const createMockResponse = () => ({
  json: jest.fn().mockReturnThis(),
  status: jest.fn().mockReturnThis(),
})

const createMockRequest = (
  validatedBody: Record<string, unknown>,
  graph: ReturnType<typeof jest.fn>
) => ({
  scope: {
    resolve: jest.fn(() => ({ graph })),
  },
  validatedBody,
})

describe("POST /admin/order-expedition/status", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("prevalidates every selected order and blocks the whole batch when one is missing", async () => {
    const { POST } = await import("../route")
    const graph = jest.fn().mockResolvedValue({
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
    const graph = jest
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
    const graph = jest
      .fn()
      .mockResolvedValueOnce({
        data: [
          { id: "order_1", display_id: 1001, status: "pending" },
          { id: "order_2", display_id: 1002, status: "pending" },
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
    const graph = jest.fn().mockResolvedValue({
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
    const graph = jest.fn().mockResolvedValue({
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

  it("blocks archive for mutable orders that must be finalized first", async () => {
    const { POST } = await import("../route")
    const graph = jest.fn().mockResolvedValue({
      data: [
        {
          id: "order_1",
          display_id: 1001,
          status: "pending",
        },
      ],
    })
    const req = createMockRequest(
      {
        order_ids: ["order_1"],
        target_status: "archived",
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
            reason: "Pending orders cannot be changed to archived",
          },
        ],
      })
    )
    expect(mockArchiveRun).not.toHaveBeenCalled()
  })

  it("allows canceled orders to be archived", async () => {
    const { POST } = await import("../route")
    const graph = jest
      .fn()
      .mockResolvedValueOnce({
        data: [
          {
            id: "order_1",
            display_id: 1001,
            status: "canceled",
          },
        ],
      })
      .mockResolvedValueOnce({
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
        target_status: "archived",
      },
      graph
    )
    const res = createMockResponse()

    await POST(req, res)

    expect(mockArchiveRun).toHaveBeenCalledWith({
      input: { orderIds: ["order_1"] },
    })
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        count: 1,
        target_status: "archived",
      })
    )
  })

  it("runs cancel through the custom bulk cancel workflow after prevalidation", async () => {
    const { POST } = await import("../route")
    const graph = jest
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
