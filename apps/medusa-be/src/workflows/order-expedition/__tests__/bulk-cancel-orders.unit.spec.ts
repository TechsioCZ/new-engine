import { describe, expect, it, vi } from "vitest"

const { mockCancelOrdersStep } = vi.hoisted(() => ({
  mockCancelOrdersStep: vi.fn(() => [{ id: "order_1" }, { id: "order_2" }]),
}))

vi.mock("@medusajs/framework/workflows-sdk", () => ({
  createWorkflow: vi.fn((_name, factory) => factory),
  WorkflowResponse: class WorkflowResponse {
    payload: unknown

    constructor(payload: unknown) {
      this.payload = payload
    }
  },
}))

vi.mock("@medusajs/medusa/core-flows", () => ({
  cancelOrdersStep: mockCancelOrdersStep,
}))

describe("bulkCancelOrdersWorkflow", () => {
  it("cancels the selected batch with one order step", async () => {
    const { bulkCancelOrdersWorkflow } = await import("../bulk-cancel-orders")

    const response = bulkCancelOrdersWorkflow({
      order_ids: ["order_1", "order_2"],
    })

    expect(mockCancelOrdersStep).toHaveBeenCalledTimes(1)
    expect(mockCancelOrdersStep).toHaveBeenCalledWith({
      orderIds: ["order_1", "order_2"],
    })
    expect(response.payload).toEqual({
      orders: [{ id: "order_1" }, { id: "order_2" }],
    })
  })
})
