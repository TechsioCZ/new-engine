import { describe, expect, it, vi } from "vitest"

const { mockCancelOrderRun, mockCancelOrderWorkflow } = vi.hoisted(() => {
  const runMock = vi.fn()

  return {
    mockCancelOrderRun: runMock,
    mockCancelOrderWorkflow: vi.fn(() => ({ run: runMock })),
  }
})

vi.mock("@medusajs/framework/workflows-sdk", () => ({
  createStep: vi.fn((_name, invoke) => invoke),
  createWorkflow: vi.fn((_name, factory) => factory),
  StepResponse: class StepResponse {
    payload: unknown

    constructor(payload: unknown) {
      this.payload = payload
    }
  },
  WorkflowResponse: class WorkflowResponse {
    payload: unknown

    constructor(payload: unknown) {
      this.payload = payload
    }
  },
}))

vi.mock("@medusajs/medusa/core-flows", () => ({
  cancelOrderWorkflow: mockCancelOrderWorkflow,
}))

describe("bulkCancelOrdersWorkflow", () => {
  it("cancels each selected order through the standard order cancellation workflow", async () => {
    const { cancelOrdersWithCancelOrderWorkflow } = await import(
      "../bulk-cancel-orders"
    )
    const container = { resolve: vi.fn() }

    const result = await cancelOrdersWithCancelOrderWorkflow(
      {
        order_ids: ["order_1", "order_2"],
      },
      container as never
    )

    expect(mockCancelOrderWorkflow).toHaveBeenCalledTimes(2)
    expect(mockCancelOrderWorkflow).toHaveBeenCalledWith(container)
    expect(mockCancelOrderRun).toHaveBeenNthCalledWith(1, {
      input: {
        order_id: "order_1",
      },
    })
    expect(mockCancelOrderRun).toHaveBeenNthCalledWith(2, {
      input: {
        order_id: "order_2",
      },
    })
    expect(result).toEqual({ order_ids: ["order_1", "order_2"] })
  })
})
