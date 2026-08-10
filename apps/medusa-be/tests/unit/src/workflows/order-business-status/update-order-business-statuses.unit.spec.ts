import { Modules } from "@medusajs/framework/utils"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@medusajs/framework/workflows-sdk", () => ({
  createStep: vi.fn((_name, invoke, compensate) =>
    Object.assign(invoke, { compensate })
  ),
  createWorkflow: vi.fn((_name, factory) => factory),
  StepResponse: class StepResponse<
    TPayload = unknown,
    TCompensationInput = unknown,
  > {
    compensateInput: TCompensationInput | undefined
    payload: TPayload

    constructor(payload: TPayload, compensateInput?: TCompensationInput) {
      this.payload = payload
      this.compensateInput = compensateInput
    }
  },
  WorkflowResponse: class WorkflowResponse {
    payload: unknown

    constructor(payload: unknown) {
      this.payload = payload
    }
  },
}))

type MockOrderService = {
  listOrders: ReturnType<typeof vi.fn>
  updateOrders: ReturnType<typeof vi.fn>
}

const makeContainer = (orderService: MockOrderService) => ({
  resolve: vi.fn((key: string) => {
    if (key === Modules.ORDER) {
      return orderService
    }

    throw new Error(`Unexpected dependency: ${key}`)
  }),
})

describe("updateOrderBusinessStatusesStep", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("updates only changed orders but processes the full selected set", async () => {
    const { updateOrderBusinessStatusesStep } = await import(
      "../../../../../src/workflows/order-business-status/update-order-business-statuses"
    )
    const orderService = {
      listOrders: vi.fn().mockResolvedValue([
        {
          id: "order_1",
          metadata: { existing: true },
        },
        {
          id: "order_2",
          metadata: { order_business_status_manual: "paid" },
        },
      ]),
      updateOrders: vi.fn().mockResolvedValue([]),
    }
    const container = makeContainer(orderService)

    const response = await updateOrderBusinessStatusesStep(
      {
        order_ids: ["order_1", "order_2"],
        status: "paid",
      },
      { container }
    )

    expect(orderService.listOrders).toHaveBeenCalledWith(
      { id: ["order_1", "order_2"] },
      { select: ["id", "metadata"], take: 2 }
    )
    expect(orderService.updateOrders).toHaveBeenCalledWith([
      {
        id: "order_1",
        metadata: {
          existing: true,
          order_business_status_manual: "paid",
        },
      },
    ])
    expect(response.payload).toEqual({
      changed_count: 1,
      order_ids: ["order_1", "order_2"],
      processed_count: 2,
      requested_count: 2,
      status: "paid",
      unchanged_count: 1,
    })
    expect(response.compensateInput).toEqual([
      { id: "order_1", metadata: { existing: true } },
    ])
  })

  it("fails before mutation when a selected order no longer exists", async () => {
    const { updateOrderBusinessStatusesStep } = await import(
      "../../../../../src/workflows/order-business-status/update-order-business-statuses"
    )
    const orderService = {
      listOrders: vi.fn().mockResolvedValue([{ id: "order_1" }]),
      updateOrders: vi.fn(),
    }

    await expect(
      updateOrderBusinessStatusesStep(
        {
          order_ids: ["order_1", "order_missing"],
          status: "delivered",
        },
        { container: makeContainer(orderService) }
      )
    ).rejects.toThrow("Orders were not found: order_missing")
    expect(orderService.updateOrders).not.toHaveBeenCalled()
  })

  it("restores previous metadata during compensation", async () => {
    const { updateOrderBusinessStatusesStep } = await import(
      "../../../../../src/workflows/order-business-status/update-order-business-statuses"
    )
    const orderService = {
      listOrders: vi.fn(),
      updateOrders: vi.fn().mockResolvedValue([]),
    }
    const step =
      updateOrderBusinessStatusesStep as typeof updateOrderBusinessStatusesStep & {
        compensate: (
          input: Array<{ id: string; metadata: Record<string, unknown> }>,
          context: { container: ReturnType<typeof makeContainer> }
        ) => Promise<void>
      }
    const previousValues = [
      { id: "order_1", metadata: { order_business_status_manual: "new" } },
    ]

    await step.compensate(previousValues, {
      container: makeContainer(orderService),
    })

    expect(orderService.updateOrders).toHaveBeenCalledWith(previousValues)
  })
})
