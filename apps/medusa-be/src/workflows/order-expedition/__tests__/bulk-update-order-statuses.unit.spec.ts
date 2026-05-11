import { beforeEach, describe, expect, it, vi } from "vitest"

const { mockEmitEventStep, mockUpdateOrdersStep } = vi.hoisted(() => ({
  mockEmitEventStep: vi.fn(),
  mockUpdateOrdersStep: vi.fn((input) => input),
}))

vi.mock("@medusajs/framework/utils", () => ({
  OrderWorkflowEvents: {
    UPDATED: "order.updated",
  },
}))

vi.mock("@medusajs/framework/workflows-sdk", () => ({
  createWorkflow: vi.fn((_name, factory) => factory),
  transform: vi.fn((input, mapper) => mapper(input)),
  WorkflowResponse: class WorkflowResponse {
    payload: unknown

    constructor(payload: unknown) {
      this.payload = payload
    }
  },
}))

vi.mock("@medusajs/medusa/core-flows", () => ({
  emitEventStep: mockEmitEventStep,
  updateOrdersStep: mockUpdateOrdersStep,
}))

describe("bulkUpdateOrderStatusesWorkflow", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("updates draft status consistently and emits order.updated for every order", async () => {
    const { bulkUpdateOrderStatusesWorkflow } = await import(
      "../bulk-update-order-statuses"
    )

    bulkUpdateOrderStatusesWorkflow({
      order_ids: ["order_1", "order_2"],
      target_status: "draft",
    })

    expect(mockUpdateOrdersStep).toHaveBeenCalledWith({
      selector: {
        id: ["order_1", "order_2"],
      },
      update: {
        is_draft_order: true,
        status: "draft",
      },
    })
    expect(mockEmitEventStep).toHaveBeenCalledWith({
      data: [{ id: "order_1" }, { id: "order_2" }],
      eventName: "order.updated",
    })
  })

  it("clears draft marker for other direct status updates", async () => {
    const { bulkUpdateOrderStatusesWorkflow } = await import(
      "../bulk-update-order-statuses"
    )

    bulkUpdateOrderStatusesWorkflow({
      order_ids: ["order_1"],
      target_status: "requires_action",
    })

    expect(mockUpdateOrdersStep).toHaveBeenCalledWith(
      expect.objectContaining({
        update: {
          is_draft_order: false,
          status: "requires_action",
        },
      })
    )
  })
})
