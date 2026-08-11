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
      {
        id: "order_1",
        metadata: { order_business_status_manual: "" },
      },
    ])
  })

  it("deduplicates selected ids while preserving the requested count", async () => {
    const { updateOrderBusinessStatusesStep } = await import(
      "../../../../../src/workflows/order-business-status/update-order-business-statuses"
    )
    const orderService = {
      listOrders: vi.fn().mockResolvedValue([
        {
          id: "order_1",
          metadata: {},
        },
      ]),
      updateOrders: vi.fn().mockResolvedValue([]),
    }

    const response = await updateOrderBusinessStatusesStep(
      {
        order_ids: ["order_1", "order_1"],
        status: "processing",
      },
      { container: makeContainer(orderService) }
    )

    expect(orderService.listOrders).toHaveBeenCalledWith(
      { id: ["order_1"] },
      { select: ["id", "metadata"], take: 1 }
    )
    expect(orderService.updateOrders).toHaveBeenCalledOnce()
    expect(response.payload).toEqual({
      changed_count: 1,
      order_ids: ["order_1"],
      processed_count: 1,
      requested_count: 2,
      status: "processing",
      unchanged_count: 0,
    })
  })

  it("rejects an empty selection before resolving the order service", async () => {
    const { updateOrderBusinessStatusesStep } = await import(
      "../../../../../src/workflows/order-business-status/update-order-business-statuses"
    )
    const orderService = {
      listOrders: vi.fn(),
      updateOrders: vi.fn(),
    }
    const container = makeContainer(orderService)

    await expect(
      updateOrderBusinessStatusesStep(
        { order_ids: [], status: "paid" },
        { container }
      )
    ).rejects.toThrow("At least one order id is required")
    expect(container.resolve).not.toHaveBeenCalled()
  })

  it("reads, updates, and compensates large selections in batches", async () => {
    const { updateOrderBusinessStatusesStep } = await import(
      "../../../../../src/workflows/order-business-status/update-order-business-statuses"
    )
    const orderIds = Array.from(
      { length: 101 },
      (_, index) => `order_${index + 1}`
    )
    const orderService = {
      listOrders: vi
        .fn()
        .mockImplementation(({ id }: { id: string[] }) =>
          Promise.resolve(id.map((orderId) => ({ id: orderId, metadata: {} })))
        ),
      updateOrders: vi.fn().mockResolvedValue([]),
    }
    const container = makeContainer(orderService)

    const response = await updateOrderBusinessStatusesStep(
      { order_ids: orderIds, status: "paid" },
      { container }
    )

    expect(orderService.listOrders).toHaveBeenCalledTimes(2)
    expect(orderService.listOrders.mock.calls[0]?.[0].id).toHaveLength(100)
    expect(orderService.listOrders.mock.calls[1]?.[0].id).toHaveLength(1)
    expect(orderService.updateOrders).toHaveBeenCalledTimes(2)
    expect(orderService.updateOrders.mock.calls[0]?.[0]).toHaveLength(100)
    expect(orderService.updateOrders.mock.calls[1]?.[0]).toHaveLength(1)

    const step =
      updateOrderBusinessStatusesStep as typeof updateOrderBusinessStatusesStep & {
        compensate: (
          input: Array<{ id: string; metadata: Record<string, unknown> }>,
          context: { container: ReturnType<typeof makeContainer> }
        ) => Promise<void>
      }

    orderService.updateOrders.mockClear()
    await step.compensate(response.compensateInput, { container })

    expect(orderService.updateOrders).toHaveBeenCalledTimes(2)
    expect(orderService.updateOrders.mock.calls[0]?.[0]).toHaveLength(100)
    expect(orderService.updateOrders.mock.calls[1]?.[0]).toHaveLength(1)
    expect(orderService.updateOrders.mock.calls[0]?.[0][0]).toEqual({
      id: "order_1",
      metadata: { order_business_status_manual: "" },
    })
  })

  it("rolls back completed batches when a later update batch fails", async () => {
    const { updateOrderBusinessStatusesStep } = await import(
      "../../../../../src/workflows/order-business-status/update-order-business-statuses"
    )
    const orderIds = Array.from(
      { length: 101 },
      (_, index) => `order_${index + 1}`
    )
    const updateError = new Error("Second update batch failed")
    const orderService = {
      listOrders: vi
        .fn()
        .mockImplementation(({ id }: { id: string[] }) =>
          Promise.resolve(id.map((orderId) => ({ id: orderId, metadata: {} })))
        ),
      updateOrders: vi
        .fn()
        .mockResolvedValueOnce([])
        .mockRejectedValueOnce(updateError)
        .mockResolvedValueOnce([]),
    }

    await expect(
      updateOrderBusinessStatusesStep(
        { order_ids: orderIds, status: "paid" },
        { container: makeContainer(orderService) }
      )
    ).rejects.toBe(updateError)

    expect(orderService.updateOrders).toHaveBeenCalledTimes(3)
    expect(orderService.updateOrders.mock.calls[2]?.[0]).toHaveLength(100)
    expect(orderService.updateOrders.mock.calls[2]?.[0][0]).toEqual({
      id: "order_1",
      metadata: { order_business_status_manual: "" },
    })
  })

  it("preserves both errors when an update and its rollback fail", async () => {
    const { updateOrderBusinessStatusesStep } = await import(
      "../../../../../src/workflows/order-business-status/update-order-business-statuses"
    )
    const orderIds = Array.from(
      { length: 101 },
      (_, index) => `order_${index + 1}`
    )
    const updateError = new Error("Second update batch failed")
    const rollbackError = new Error("Rollback failed")
    const orderService = {
      listOrders: vi
        .fn()
        .mockImplementation(({ id }: { id: string[] }) =>
          Promise.resolve(id.map((orderId) => ({ id: orderId, metadata: {} })))
        ),
      updateOrders: vi
        .fn()
        .mockResolvedValueOnce([])
        .mockRejectedValueOnce(updateError)
        .mockRejectedValueOnce(rollbackError),
    }

    try {
      await updateOrderBusinessStatusesStep(
        { order_ids: orderIds, status: "paid" },
        { container: makeContainer(orderService) }
      )
      expect.unreachable("Expected the update and rollback to fail")
    } catch (error) {
      expect(error).toBeInstanceOf(AggregateError)

      if (!(error instanceof AggregateError)) {
        return
      }

      expect(error.errors).toEqual([updateError, rollbackError])
    }
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

  it("restores the previous override without replacing unrelated metadata", async () => {
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
      { id: "order_2", metadata: { order_business_status_manual: "" } },
    ]

    await step.compensate(previousValues, {
      container: makeContainer(orderService),
    })

    expect(orderService.updateOrders).toHaveBeenCalledWith(previousValues)
  })
})
