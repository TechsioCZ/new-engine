import { beforeEach, describe, expect, it, vi } from "vitest"

import type { OrderExpeditionDirectUpdateStatus } from "../../../../../src/workflows/order-expedition/bulk-update-order-statuses"

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

type WorkflowComposer = (input: BulkUpdateOrderStatusesWorkflowInput) => void
type Step = (input: unknown) => unknown
type WorkflowFactory = (input: BulkUpdateOrderStatusesWorkflowInput) => unknown
type CreateWorkflow = (
  name: string,
  factory: WorkflowFactory,
) => WorkflowFactory
type Transform = (
  input: unknown,
  mapper: (value: unknown) => unknown,
) => unknown

interface BulkUpdateOrderStatusesWorkflowInput {
  order_ids: string[]
  target_status: OrderExpeditionDirectUpdateStatus
}

const isWorkflowComposer = (workflow: unknown): workflow is WorkflowComposer =>
  typeof workflow === "function"

const asMockedWorkflowComposer = (workflow: unknown): WorkflowComposer => {
  if (!isWorkflowComposer(workflow)) {
    throw new TypeError("mocked workflow composer must be a function")
  }
  return workflow
}

const { mockEmitEventStep, mockUpdateOrdersStep } = vi.hoisted(() => ({
  mockEmitEventStep: vi.fn<Step>(),
  mockUpdateOrdersStep: vi.fn<Step>((input) => input),
}))

vi.mock(import("@medusajs/framework/utils"), async (importOriginal) =>
  overrideModule(await importOriginal(), {
    OrderWorkflowEvents: {
      UPDATED: "order.updated",
    },
  }),
)

vi.mock(import("@medusajs/framework/workflows-sdk"), async (importOriginal) =>
  overrideModule(await importOriginal(), {
    WorkflowResponse: class WorkflowResponse {
      payload: unknown

      constructor(payload: unknown) {
        this.payload = payload
      }
    },
    createWorkflow: vi.fn<CreateWorkflow>((_name, factory) => factory),
    transform: vi.fn<Transform>((input, mapper) => mapper(input)),
  }),
)

vi.mock(import("@medusajs/medusa/core-flows"), async (importOriginal) =>
  overrideModule(await importOriginal(), {
    emitEventStep: mockEmitEventStep,
    updateOrdersStep: mockUpdateOrdersStep,
  }),
)

describe("bulkUpdateOrderStatusesWorkflow", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("updates draft status consistently and emits order.updated for every order", async () => {
    const { bulkUpdateOrderStatusesWorkflow } =
      await import("../../../../../src/workflows/order-expedition/bulk-update-order-statuses")

    asMockedWorkflowComposer(bulkUpdateOrderStatusesWorkflow)({
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
    const { bulkUpdateOrderStatusesWorkflow } =
      await import("../../../../../src/workflows/order-expedition/bulk-update-order-statuses")

    asMockedWorkflowComposer(bulkUpdateOrderStatusesWorkflow)({
      order_ids: ["order_1"],
      target_status: "requires_action",
    })

    expect(mockUpdateOrdersStep).toHaveBeenCalledWith(
      expect.objectContaining({
        update: {
          is_draft_order: false,
          status: "requires_action",
        },
      }),
    )
  })
})
