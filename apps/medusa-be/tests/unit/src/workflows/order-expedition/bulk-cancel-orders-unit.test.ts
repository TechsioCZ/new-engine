import { createMedusaContainer } from "@medusajs/framework/utils"
import { describe, expect, it, vi } from "vitest"

const { overrideModule } = vi.hoisted(() => ({
  overrideModule: <Module extends object>(
    original: Module,
    replacements: Record<PropertyKey, unknown>,
  ): Module =>
    Object.defineProperties(
      { ...original },
      Object.getOwnPropertyDescriptors(replacements),
    ),
}))

type CancelOrderRun = (input: {
  input: { order_id: string }
}) => Promise<unknown>
type CancelOrderWorkflow = (container: unknown) => { run: CancelOrderRun }
type WorkflowFactory = (input: unknown) => unknown

const { mockCancelOrderRun, mockCancelOrderWorkflow } = vi.hoisted(() => {
  const runMock = vi.fn<CancelOrderRun>()

  return {
    mockCancelOrderRun: runMock,
    mockCancelOrderWorkflow: vi.fn<CancelOrderWorkflow>(() => ({
      run: runMock,
    })),
  }
})

vi.mock(import("@medusajs/framework/workflows-sdk"), async (importOriginal) => {
  const original = await importOriginal()
  class MockResponse {
    payload: unknown

    constructor(payload: unknown) {
      this.payload = payload
    }
  }

  return overrideModule(original, {
    StepResponse: MockResponse,
    WorkflowResponse: MockResponse,
    createStep: vi.fn<
      (name: string, invoke: WorkflowFactory) => WorkflowFactory
    >((_name, invoke) => invoke),
    createWorkflow: vi.fn<
      (name: string, factory: WorkflowFactory) => WorkflowFactory
    >((_name, factory) => factory),
  })
})

vi.mock(import("@medusajs/medusa/core-flows"), async (importOriginal) =>
  overrideModule(await importOriginal(), {
    cancelOrderWorkflow: mockCancelOrderWorkflow,
  }),
)

describe("bulkCancelOrdersWorkflow", () => {
  it("cancels each selected order through the standard order cancellation workflow", async () => {
    const { cancelOrdersWithCancelOrderWorkflow } =
      await import("../../../../../src/workflows/order-expedition/bulk-cancel-orders")
    const container = createMedusaContainer()

    const result = await cancelOrdersWithCancelOrderWorkflow(
      {
        order_ids: ["order_1", "order_2"],
      },
      container,
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
    expect(result).toStrictEqual({ order_ids: ["order_1", "order_2"] })
  })
})
